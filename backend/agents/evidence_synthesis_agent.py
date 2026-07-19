import asyncio
import json
import logging
import re
import uuid
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from google import genai
from google.genai import types
import httpx
from config import settings

logger = logging.getLogger(__name__)

class ExtractedClaim(BaseModel):
    content: str
    type: str  # strategic_belief, metric, assumption, operational_fact
    evidence_ids: List[str]
    confidence: float = Field(default=0.5, ge=0.0, le=1.0)
    reasoning: str

class ExtractedEvidence(BaseModel):
    id: str
    content: str
    type: str  # survey_result, metric, interview, report, analysis, data_gap
    polarity: str  # supporting, contradicting, neutral
    reliability_score: float = Field(default=0.5, ge=0.0, le=1.0)
    chunk_id: str
    reasoning: str
    caveats: List[str]

class SynthesisOutput(BaseModel):
    claims: List[ExtractedClaim]
    evidence: List[ExtractedEvidence]
    assumptions_extracted: List[Dict[str, Any]]
    quality_metrics: Dict[str, Any]

class EvidenceSynthesisAgent:
    def __init__(
        self,
        gemini_key: Optional[str] = None,
        groq_key: Optional[str] = None,
        primary_model: Optional[str] = None,
        fallback_model: Optional[str] = None
    ):
        self.gemini_key = gemini_key or settings.GEMINI_API_KEY
        self.groq_key = groq_key or settings.GROQ_API_KEY
        self.primary_model = primary_model or settings.AI_PRIMARY_MODEL
        self.fallback_model = fallback_model or settings.AI_FALLBACK_MODEL
        self.gemini_client = None

        # Configure Google GenAI Client
        if self.gemini_key:
            try:
                self.gemini_client = genai.Client(api_key=self.gemini_key)
                self.gemini_enabled = True
                logger.info("Google GenAI client successfully configured.")
            except Exception as e:
                logger.error(f"Failed to configure Google GenAI client: {e}")
                self.gemini_enabled = False
        else:
            self.gemini_enabled = False
            logger.info("No GEMINI_API_KEY found. Gemini is disabled.")

        if self.groq_key:
            self.groq_enabled = True
            logger.info("Groq provider client successfully configured.")
        else:
            self.groq_enabled = False
            logger.info("No GROQ_API_KEY found. Groq is disabled.")

    async def run(self, document_id: str, title: str, chunks: List[Dict[str, Any]], progress_callback=None) -> SynthesisOutput:
        """Run evidence synthesis on document chunks in parallel batches using asyncio.gather."""
        if not chunks:
            return SynthesisOutput(claims=[], evidence=[], assumptions_extracted=[], quality_metrics={"status": "empty"})

        # Group chunks into small batches to prevent LLM payload limits and process in parallel
        # Batch size of 2 perfectly packs ~6,600 tokens (well within Groq's 8k limit) 
        # based on the 15,000 char (2500 word) chunk size from DocumentProcessor.
        batch_size = 2
        chunk_batches = [chunks[i : i + batch_size] for i in range(0, len(chunks), batch_size)]
        
        logger.info(f"Splitting {len(chunks)} chunks into {len(chunk_batches)} parallel batches for processing.")
        
        results = []
        for i, batch in enumerate(chunk_batches):
            batch_title = f"{title} (Part {i+1})"
            try:
                res = await self._process_batch(document_id, batch_title, batch)
                results.append(res)
            except Exception as e:
                logger.error(f"Error processing batch: {e}", exc_info=True)
                results.append(e)
            
            # Update progress after each batch
            if progress_callback:
                percent = int(((i + 1) / len(chunk_batches)) * 100)
                await progress_callback(percent)
        
        merged_claims = []
        merged_evidence = []
        merged_assumptions = []
        coverage_estimates = []
        extraction_confidences = []
        default_claims = []
        
        for res in results:
            if isinstance(res, Exception):
                logger.error(f"Error processing batch in parallel gather: {res}", exc_info=True)
                continue
            if not res:
                continue
                
            for c in res.claims:
                if c.content.startswith("Information extracted from"):
                    default_claims.append(c)
                else:
                    merged_claims.append(c)
                    
            merged_evidence.extend(res.evidence)
            merged_assumptions.extend(res.assumptions_extracted)
            
            metrics = res.quality_metrics or {}
            if "coverage_estimate" in metrics:
                try:
                    coverage_estimates.append(float(metrics["coverage_estimate"]))
                except (ValueError, TypeError):
                    pass
            if "extraction_confidence" in metrics:
                try:
                    extraction_confidences.append(float(metrics["extraction_confidence"]))
                except (ValueError, TypeError):
                    pass
                    
        # If we have no real claims, but we have default operational fallback claims, keep exactly one default claim
        if not merged_claims and default_claims:
            merged_claims.append(default_claims[0])
            
        final_coverage = sum(coverage_estimates) / len(coverage_estimates) if coverage_estimates else 0.85
        final_confidence = sum(extraction_confidences) / len(extraction_confidences) if extraction_confidences else 0.85
        
        return SynthesisOutput(
            claims=merged_claims,
            evidence=merged_evidence,
            assumptions_extracted=merged_assumptions,
            quality_metrics={
                "extraction_confidence": final_confidence,
                "coverage_estimate": final_coverage,
                "batches_processed": len(chunk_batches)
            }
        )

    async def _process_batch(self, document_id: str, title: str, batch: List[Dict[str, Any]]) -> SynthesisOutput:
        """Helper to process a single batch of chunks with fallback logic and Redis caching."""
        import hashlib
        import json
        
        # 1. Generate chunk hash for idempotency
        raw_text = "".join(c.get("content", "") for c in batch)
        batch_hash = hashlib.sha256(raw_text.encode('utf-8')).hexdigest()
        cache_key = f"llm_cache:synthesis:{batch_hash}"
        
        redis_client = None
        try:
            import redis
            from config import settings
            redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
            cached_result = redis_client.get(cache_key)
            if cached_result:
                logger.info(f"LLM Cache HIT for {cache_key[:15]}! Skipping API call.")
                # Try Pydantic V2 first, fallback to V1
                try:
                    return SynthesisOutput.model_validate_json(cached_result)
                except AttributeError:
                    return SynthesisOutput.parse_raw(cached_result)
        except Exception as e:
            logger.warning(f"Redis cache check failed: {e}")

        result = None
        # Try Gemini (Primary)
        if self.gemini_enabled:
            try:
                logger.info(f"Attempting evidence synthesis using Gemini ({self.primary_model}) on batch...")
                result = await self._run_gemini(document_id, title, batch)
            except Exception as e:
                logger.error(f"Gemini synthesis failed for batch: {e}. Falling back to Groq...")

        # Try Groq (Fallback)
        if not result and self.groq_enabled:
            try:
                logger.info(f"Attempting evidence synthesis using Groq ({self.fallback_model}) on batch...")
                result = await self._run_groq(document_id, title, batch)
            except Exception as e:
                logger.error(f"Groq synthesis failed for batch: {e}. Falling back to heuristic parser...")

        if not result:
            # Run local fallback Heuristics parser
            logger.info("Using local heuristic parser as the final fallback for batch.")
            result = self._run_fallback(document_id, title, batch)

        # Cache the result if successful
        if result and redis_client:
            try:
                # Cache for 30 days
                try:
                    json_data = result.model_dump_json()
                except AttributeError:
                    json_data = result.json()
                redis_client.setex(cache_key, 2592000, json_data)
            except Exception as e:
                logger.warning(f"Failed to cache LLM result: {e}")

        return result

    async def _run_gemini(self, document_id: str, title: str, chunks: List[Dict[str, Any]]) -> SynthesisOutput:
        chunks_text = "\n---\n".join([
            f"CHUNK {c['chunk_id']}:\n{c['content']}"
            for c in chunks
        ])

        system_prompt = """You are the Evidence Synthesis Agent for DiscoveryOS.
Your job is to extract claims and evidence from documents.

CRITICAL RULES:
1. Map extracted claim types strictly to: "strategic_belief", "metric", "assumption", or "operational_fact".
2. Map evidence types strictly to: "survey_result", "metric", "interview", "report", "analysis", or "data_gap".
3. Map evidence polarity strictly to: "supporting", "contradicting", or "neutral".
4. Rating confidence and reliability scores must be float values between 0.0 and 1.0.
5. Identify caveats and assumptions that might affect validity.
6. Return a valid, raw JSON object matching the requested schema. Do not wrap in markdown codeblocks (e.g. do not wrap in ```json)."""

        prompt = f"""Extract claims and evidence from the document titled "{title}".

DOCUMENT ID: {document_id}

CHUNKS:
{chunks_text}

Return JSON matching this schema:
{{
  "claims": [
    {{
      "content": "string (extracted claim, verbatim or closely summarized)",
      "type": "strategic_belief|metric|assumption|operational_fact",
      "evidence_ids": ["string (matches the id of the evidence that supports or contradicts this claim)"],
      "confidence": 0.0-1.0,
      "reasoning": "reasoning for extraction and type classification"
    }}
  ],
  "evidence": [
    {{
      "id": "string (e.g. ev_chunk_1_0)",
      "content": "string (evidence text extracted from the chunk)",
      "type": "survey_result|metric|interview|report|analysis|data_gap",
      "polarity": "supporting|contradicting|neutral",
      "reliability_score": 0.0-1.0,
      "chunk_id": "string (the chunk_id this evidence came from)",
      "reasoning": "why this is considered evidence",
      "caveats": ["string (caveats, limitations, or sources of bias)"]
    }}
  ],
  "assumptions_extracted": [
    {{
      "content": "string (implicit assumption required for the claim to hold)",
      "exposure_score": 0.0-1.0,
      "justification": "why this assumption is critical"
    }}
  ],
  "quality_metrics": {{
    "extraction_confidence": 0.85,
    "coverage_estimate": 0.90,
    "caveats_found": 3,
    "assumptions_exposed": 2
  }}
}}"""

        if not self.gemini_client:
            raise ValueError("Gemini client is not initialized.")

        try:
            # First try with JSON response mime type configuration
            response = await self.gemini_client.aio.models.generate_content(
                model=self.primary_model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system_prompt,
                    response_mime_type="application/json",
                    temperature=0.1
                )
            )
            response_text = response.text
        except Exception as e:
            logger.warning(f"Gemini generation with application/json failed: {e}. Retrying without mime type config.")
            response = await self.gemini_client.aio.models.generate_content(
                model=self.primary_model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system_prompt,
                    temperature=0.1
                )
            )
            response_text = response.text

        response_text = self._clean_json_string(response_text)
        result = json.loads(response_text)
        sanitized = self._sanitize_synthesis_data(result)
        return SynthesisOutput(**sanitized)

    async def _run_groq(self, document_id: str, title: str, chunks: List[Dict[str, Any]]) -> SynthesisOutput:
        chunks_text = "\n---\n".join([
            f"CHUNK {c['chunk_id']}:\n{c['content']}"
            for c in chunks
        ])

        system_prompt = """You are the Evidence Synthesis Agent for DiscoveryOS.
Your job is to extract claims and evidence from documents.

CRITICAL RULES:
1. Map extracted claim types strictly to: "strategic_belief", "metric", "assumption", or "operational_fact".
2. Map evidence types strictly to: "survey_result", "metric", "interview", "report", "analysis", or "data_gap".
3. Map evidence polarity strictly to: "supporting", "contradicting", or "neutral".
4. Rating confidence and reliability scores must be float values between 0.0 and 1.0.
5. Identify caveats and assumptions that might affect validity.
6. Return a valid, raw JSON object matching the requested schema. Do not wrap in markdown codeblocks (e.g. do not wrap in ```json)."""

        prompt = f"""Extract claims and evidence from the document titled "{title}".

DOCUMENT ID: {document_id}

CHUNKS:
{chunks_text}

Return JSON matching this schema:
{{
  "claims": [
    {{
      "content": "string (extracted claim, verbatim or closely summarized)",
      "type": "strategic_belief|metric|assumption|operational_fact",
      "evidence_ids": ["string (matches the id of the evidence that supports or contradicts this claim)"],
      "confidence": 0.0-1.0,
      "reasoning": "reasoning for extraction and type classification"
    }}
  ],
  "evidence": [
    {{
      "id": "string (e.g. ev_chunk_1_0)",
      "content": "string (evidence text extracted from the chunk)",
      "type": "survey_result|metric|interview|report|analysis|data_gap",
      "polarity": "supporting|contradicting|neutral",
      "reliability_score": 0.0-1.0,
      "chunk_id": "string (the chunk_id this evidence came from)",
      "reasoning": "why this is considered evidence",
      "caveats": ["string (caveats, limitations, or sources of bias)"]
    }}
  ],
  "assumptions_extracted": [
    {{
      "content": "string (implicit assumption required for the claim to hold)",
      "exposure_score": 0.0-1.0,
      "justification": "why this assumption is critical"
    }}
  ],
  "quality_metrics": {{
    "extraction_confidence": 0.85,
    "coverage_estimate": 0.90,
    "caveats_found": 3,
    "assumptions_exposed": 2
  }}
}}"""

        headers = {
            "Authorization": f"Bearer {self.groq_key}",
            "Content-Type": "application/json"
        }

        payload = {
            "model": self.fallback_model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.1,
            "response_format": {"type": "json_object"}
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                r = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    json=payload,
                    headers=headers
                )
                r.raise_for_status()
                response_data = r.json()
                response_text = response_data["choices"][0]["message"]["content"]
        except Exception as e:
            logger.warning(f"Groq API call with JSON mode failed: {e}. Retrying without JSON mode constraint.")
            payload.pop("response_format", None)
            async with httpx.AsyncClient(timeout=30.0) as client:
                r = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    json=payload,
                    headers=headers
                )
                r.raise_for_status()
                response_data = r.json()
                response_text = response_data["choices"][0]["message"]["content"]

        response_text = self._clean_json_string(response_text)
        result = json.loads(response_text)
        sanitized = self._sanitize_synthesis_data(result)
        return SynthesisOutput(**sanitized)

    def _clean_json_string(self, s: str) -> str:
        s = s.strip()
        # Extract the JSON block by finding the outermost curly braces
        start_idx = s.find('{')
        end_idx = s.rfind('}')
        if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
            return s[start_idx:end_idx+1].strip()
        return s

    def _sanitize_synthesis_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Ensure all fields conform to Pydantic expectations to avoid ValidationErrors."""
        if not isinstance(data, dict):
            return {"claims": [], "evidence": [], "assumptions_extracted": [], "quality_metrics": {}}
            
        claims = data.get("claims", [])
        if not isinstance(claims, list):
            claims = []
        sanitized_claims = []
        for c in claims:
            if not isinstance(c, dict):
                continue
            content = str(c.get("content", ""))
            c_type = str(c.get("type", "operational_fact"))
            if c_type not in ["strategic_belief", "metric", "assumption", "operational_fact"]:
                c_type = "operational_fact"
            evidence_ids = c.get("evidence_ids", [])
            if not isinstance(evidence_ids, list):
                evidence_ids = [str(evidence_ids)] if evidence_ids else []
            else:
                evidence_ids = [str(e) for e in evidence_ids]
            
            try:
                confidence = float(c.get("confidence", 0.5))
                confidence = max(0.0, min(1.0, confidence))
            except (ValueError, TypeError):
                confidence = 0.5
                
            reasoning = str(c.get("reasoning", ""))
            
            sanitized_claims.append({
                "content": content,
                "type": c_type,
                "evidence_ids": evidence_ids,
                "confidence": confidence,
                "reasoning": reasoning
            })
            
        evidence = data.get("evidence", [])
        if not isinstance(evidence, list):
            evidence = []
        sanitized_evidence = []
        for e in evidence:
            if not isinstance(e, dict):
                continue
            e_id = str(e.get("id", f"ev_auto_{uuid.uuid4().hex[:6]}"))
            content = str(e.get("content", ""))
            e_type = str(e.get("type", "report"))
            if e_type not in ["survey_result", "metric", "interview", "report", "analysis", "data_gap"]:
                e_type = "report"
            polarity = str(e.get("polarity", "neutral"))
            if polarity not in ["supporting", "contradicting", "neutral"]:
                polarity = "neutral"
                
            try:
                reliability_score = float(e.get("reliability_score", 0.5))
                reliability_score = max(0.0, min(1.0, reliability_score))
            except (ValueError, TypeError):
                reliability_score = 0.5
                
            chunk_id = str(e.get("chunk_id", ""))
            reasoning = str(e.get("reasoning", ""))
            caveats = e.get("caveats", [])
            if not isinstance(caveats, list):
                caveats = [str(caveats)] if caveats else []
            else:
                caveats = [str(c) for c in caveats]
                
            sanitized_evidence.append({
                "id": e_id,
                "content": content,
                "type": e_type,
                "polarity": polarity,
                "reliability_score": reliability_score,
                "chunk_id": chunk_id,
                "reasoning": reasoning,
                "caveats": caveats
            })
            
        assumptions = data.get("assumptions_extracted", [])
        if not isinstance(assumptions, list):
            assumptions = []
        sanitized_assumptions = []
        for a in assumptions:
            if not isinstance(a, dict):
                continue
            content = str(a.get("content", ""))
            try:
                exposure_score = float(a.get("exposure_score", 0.5))
                exposure_score = max(0.0, min(1.0, exposure_score))
            except (ValueError, TypeError):
                exposure_score = 0.5
            justification = str(a.get("justification", ""))
            
            sanitized_assumptions.append({
                "content": content,
                "exposure_score": exposure_score,
                "justification": justification
            })
            
        quality = data.get("quality_metrics", {})
        if not isinstance(quality, dict):
            quality = {}
            
        return {
            "claims": sanitized_claims,
            "evidence": sanitized_evidence,
            "assumptions_extracted": sanitized_assumptions,
            "quality_metrics": quality
        }

    def _run_fallback(self, document_id: str, title: str, chunks: List[Dict[str, Any]]) -> SynthesisOutput:
        """Fallback rule-based heuristic parser to extract claims and evidence from raw text."""
        claims = []
        evidence_list = []
        assumptions = []

        claim_idx = 1
        ev_idx = 1

        for c in chunks:
            chunk_id = c['chunk_id']
            content = c['content']

            # Split into sentences
            sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', content) if len(s.strip()) > 15]

            for i, sent in enumerate(sentences):
                # Heuristic 1: Metric Claims
                if any(x in sent.lower() for x in ["%", "percent", "$", "usd", "revenue", "cost", "conversion", "metrics", "increased", "decreased"]):
                    claim_id = f"cl-{document_id}-{claim_idx}"
                    ev_id = f"ev-{document_id}-{ev_idx}"
                    
                    claims.append(ExtractedClaim(
                        content=sent,
                        type="metric",
                        evidence_ids=[ev_id],
                        confidence=0.85 if "%" in sent else 0.70,
                        reasoning="Contains numeric metrics or quantitative progress indicator."
                    ))
                    
                    # Context for evidence (next sentence or current sentence as fact)
                    ev_content = sentences[i+1] if i + 1 < len(sentences) else sent
                    evidence_list.append(ExtractedEvidence(
                        id=ev_id,
                        content=f"Quantitative metric observed: {ev_content}",
                        type="metric",
                        polarity="supporting",
                        reliability_score=0.90,
                        chunk_id=chunk_id,
                        reasoning="Direct numerical or metric measurement in source text.",
                        caveats=["Unverified statistical significance", "Needs source validation"]
                    ))
                    
                    claim_idx += 1
                    ev_idx += 1

                # Heuristic 2: Strategic Belief / Assumption Claims
                elif any(x in sent.lower() for x in ["should", "must", "will", "believe", "assume", "strategy", "priority", "critical"]):
                    claim_id = f"cl-{document_id}-{claim_idx}"
                    ev_id = f"ev-{document_id}-{ev_idx}"
                    
                    is_assumption = any(x in sent.lower() for x in ["assume", "hypothesis", "suppose"])
                    c_type = "assumption" if is_assumption else "strategic_belief"
                    
                    claims.append(ExtractedClaim(
                        content=sent,
                        type=c_type,
                        evidence_ids=[ev_id],
                        confidence=0.60 if is_assumption else 0.75,
                        reasoning="Contains strategic assertion or operational assumption language."
                    ))
                    
                    evidence_list.append(ExtractedEvidence(
                        id=ev_id,
                        content=f"Assertion statement in text: {sent}",
                        type="report",
                        polarity="supporting",
                        reliability_score=0.70,
                        chunk_id=chunk_id,
                        reasoning="Textual claim of strategic direction or belief.",
                        caveats=["Subjective opinion", "High dependency on execution"]
                    ))

                    if is_assumption:
                        assumptions.append({
                            "content": f"Underlying assumption: {sent}",
                            "exposure_score": 0.75,
                            "justification": "Required for strategic belief or operational projection."
                        })
                    
                    claim_idx += 1
                    ev_idx += 1

        # Add a default operational claim if none were found
        if not claims:
            claim_id = f"cl-{document_id}-1"
            ev_id = f"ev-{document_id}-1"
            claims.append(ExtractedClaim(
                content=f"Information extracted from {title}",
                type="operational_fact",
                evidence_ids=[ev_id],
                confidence=0.75,
                reasoning="General summary fact extracted from the uploaded document content."
            ))
            evidence_list.append(ExtractedEvidence(
                id=ev_id,
                content=chunks[0]['content'][:200] + "...",
                type="report",
                polarity="supporting",
                reliability_score=0.80,
                chunk_id=chunks[0]['chunk_id'],
                reasoning="Extracted context summary.",
                caveats=["High-level summarization"]
            ))

        return SynthesisOutput(
            claims=claims,
            evidence=evidence_list,
            assumptions_extracted=assumptions,
            quality_metrics={
                "extraction_confidence": 0.80,
                "coverage_estimate": 0.85,
                "caveats_found": len(evidence_list),
                "assumptions_exposed": len(assumptions),
                "status": "fallback_heuristic"
            }
        )
