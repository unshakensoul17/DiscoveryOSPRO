import logging
import json
import numpy as np
from typing import Dict, Any, List, Set, Tuple
from sqlalchemy.orm import Session
from rapidfuzz import fuzz

from services.graph_service import GraphService
from agents.evidence_synthesis_agent import EvidenceSynthesisAgent

logger = logging.getLogger(__name__)

# Common product discovery synonym mappings for semantic expansion
SYNONYM_DICTIONARY = {
    "churn": ["cancel", "cancellation", "drop off", "attrition", "leave", "retention"],
    "retention": ["churn", "engagement", "stickiness", "cohort", "repeat"],
    "pricing": ["cost", "price", "tier", "subscription", "$49", "budget", "billing", "expensive"],
    "enterprise": ["sso", "saml", "rbac", "b2b", "compliance", "security", "legacy"],
    "onboarding": ["signup", "flow", "activation", "welcome", "experiment", "a/b"],
    "risk": ["threat", "assumption", "unvalidated", "uncertainty", "gap", "bias"]
}

class VectorGraphEngine:
    """Lightweight in-memory dense vector embedding & hybrid semantic scoring engine."""

    @staticmethod
    def _to_ngram_vector(text: str, vector_dim: int = 512) -> np.ndarray:
        """Generate normalized character/token n-gram frequency vector."""
        vec = np.zeros(vector_dim, dtype=np.float32)
        words = text.lower().split()
        if not words:
            return vec

        # Token n-grams and character 3-grams hashing
        for word in words:
            # Word hash index
            w_idx = hash(word) % vector_dim
            vec[w_idx] += 1.0
            
            # Subword character tri-grams
            if len(word) >= 3:
                for i in range(len(word) - 2):
                    char_gram = word[i:i+3]
                    cg_idx = hash(char_gram) % vector_dim
                    vec[cg_idx] += 0.5

        norm = np.linalg.norm(vec)
        if norm > 0:
            vec /= norm
        return vec

    @classmethod
    def calculate_hybrid_score(cls, query: str, content: str) -> float:
        """Compute hybrid score using Dense Vector Cosine Similarity + RapidFuzz Token Set Ratio + Synonym Expansion."""
        q_clean = query.lower()
        c_clean = content.lower()

        if not q_clean or not c_clean:
            return 0.0

        # 1. Dense Vector Cosine Similarity
        v_q = cls._to_ngram_vector(q_clean)
        v_c = cls._to_ngram_vector(c_clean)
        cosine_sim = float(np.dot(v_q, v_c))

        # 2. RapidFuzz Fuzzy Token-Set Ratio (0.0 to 1.0)
        fuzzy_sim = fuzz.token_set_ratio(q_clean, c_clean) / 100.0

        # 3. Intent & Synonym Expansion Boost
        synonym_boost = 0.0
        for key_term, synonyms in SYNONYM_DICTIONARY.items():
            if key_term in q_clean:
                for syn in synonyms:
                    if syn in c_clean:
                        synonym_boost += 0.25
                        break

        # Weighted Hybrid Score
        hybrid_score = (0.45 * cosine_sim) + (0.35 * fuzzy_sim) + min(0.20, synonym_boost)
        return round(hybrid_score, 4)


class GraphRAGService:
    def __init__(self, db: Session):
        self.db = db
        self.graph_service = GraphService(db)

    async def answer_question(self, workspace_id: str, query: str) -> Dict[str, Any]:
        """Perform Hybrid Vector + Graph RAG retrieval + LLM synthesis to answer complex product discovery questions."""
        # 1. Build workspace graph
        G = self.graph_service.build_workspace_graph(workspace_id)
        
        if len(G) == 0:
            return {
                "answer": "No claims or evidence have been ingested into this workspace knowledge graph yet. Please upload documents or add claims first.",
                "citations": [],
                "subgraph": {"nodes": [], "edges": []}
            }

        # 2. Semantic Dense Vector + Hybrid Fuzzy Scoring for Seed Nodes Selection
        node_scores: Dict[str, float] = {}
        for n, data in G.nodes(data=True):
            content = data.get("content") or data.get("title") or data.get("label") or ""
            score = VectorGraphEngine.calculate_hybrid_score(query, content)
            if score > 0.05:
                node_scores[n] = score

        # Sort candidate seed nodes semantically
        seed_nodes = sorted(node_scores.keys(), key=lambda n: node_scores[n], reverse=True)[:4]
        if not seed_nodes:
            # Fallback to top nodes by network degree centrality
            seed_nodes = sorted(G.nodes(), key=lambda n: G.degree(n), reverse=True)[:3]

        # 3. Extract 2-hop topological neighborhood sub-graph for seed nodes
        collected_nodes: Set[str] = set(seed_nodes)
        for s_node in seed_nodes:
            sub = self.graph_service.get_subgraph(workspace_id, s_node, max_hops=2)
            for node in sub["nodes"]:
                collected_nodes.add(node["id"])

        # Format sub-graph context text for LLM
        graph_text_lines = []
        citations = []

        for nid in collected_nodes:
            if not G.has_node(nid):
                continue
            ndata = G.nodes[nid]
            ntype = ndata.get("node_type", "node").upper()
            content = ndata.get("content") or ndata.get("title") or ndata.get("label")
            conf = ndata.get("confidence")
            conf_str = f" (Confidence: {round(conf*100)}%)" if conf is not None else ""
            
            graph_text_lines.append(f"- [{ntype} ID: {nid}] {content}{conf_str}")
            citations.append({
                "id": nid,
                "type": ndata.get("node_type"),
                "label": content[:80] if content else ""
            })

        # Format Edges in Sub-Graph Context
        graph_text_lines.append("\nRELATIONSHIPS & EVIDENCE EDGES:")
        edge_subgraph_list = []
        for u, v, edata in G.edges(data=True):
            if u in collected_nodes and v in collected_nodes:
                rel = edata.get("relation_type", "RELATED_TO")
                u_lbl = G.nodes[u].get("label", u)[:40]
                v_lbl = G.nodes[v].get("label", v)[:40]
                graph_text_lines.append(f"  * [{u_lbl}] --{rel}--> [{v_lbl}]")
                edge_subgraph_list.append({
                    "source": u,
                    "target": v,
                    "relation_type": rel
                })

        context_str = "\n".join(graph_text_lines)

        # 4. Synthesize with Gemini via Agent
        agent = EvidenceSynthesisAgent()
        prompt = f"""
You are DiscoveryOS Graph AI Copilot. You produce HIGH-DENSITY, CONCISE EXECUTIVE INSIGHTS for Product Managers. NO FLUFF. NO REPETITION.

USER QUESTION:
"{query}"

KNOWLEDGE GRAPH CONTEXT (Nodes & Edges):
{context_str}

STRICT CONCISENESS & GROUNDING RULES:
1. BREVITY FIRST: Keep the ENTIRE response under 150-180 words. Every sentence must deliver high-density strategic value.
2. ABSENCE RULE: If user asks about a missing entity/topic, state in first sentence: "No data found for '[Topic]' in current Knowledge Graph."
3. NODE CITATIONS: Cite IDs inline succinctly e.g. `[CLAIM: id]` or `[EVIDENCE: id]`.
4. ZERO CORPORATE FLUFF: Omit introductory fluff ("Regarding the areas...", "Analysis of...", "The provided dataset contains..."). Write direct, punchy facts.

REQUIRED CONCISE MARKDOWN FORMAT:

### 🎯 Direct Summary
(1 sharp, direct sentence)

### 🔍 Key Findings
(2-3 punchy bullet points with inline Node IDs)

### ⚡ Contradictions & Gaps
(1-2 short bullet points detailing CONTRADICTS edges or unvalidated risks)

### 💡 Strategic Next Step
(1-2 direct action items for Product Managers)
"""
        try:
            raw_response = await agent._call_ai(prompt)
            answer = raw_response.strip()
        except Exception as e:
            logger.error(f"Error calling AI for GraphRAG copilot: {e}")
            answer = f"Based on the Knowledge Graph context: Found {len(collected_nodes)} related nodes across your research evidence. (LLM synthesis unavailable)."

        subgraph_payload = {
            "nodes": citations,
            "edges": edge_subgraph_list
        }

        return {
            "answer": answer,
            "citations": citations,
            "subgraph": subgraph_payload
        }

