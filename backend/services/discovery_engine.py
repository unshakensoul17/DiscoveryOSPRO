import logging
import uuid
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from models.claim import Claim, ClaimStatus
from models.evidence import Evidence, EvidencePolarity
from models.discovery import Discovery, DiscoveryType, DiscoveryStatus
from models.knowledge_state import KnowledgeState, KnowledgeStateHistory

logger = logging.getLogger(__name__)

class DiscoveryEngine:
    def __init__(self, db: Session):
        self.db = db

    async def run(self, workspace_id: str) -> int:
        """Run all detectors for a workspace and return the number of discoveries found."""
        discoveries = []

        try:
            # 1. Contradiction Detector
            contr_discoveries = await self._detect_contradictions(workspace_id)
            discoveries.extend(contr_discoveries)

            # 2. Stale Evidence Detector
            stale_discoveries = await self._detect_stale_evidence(workspace_id)
            discoveries.extend(stale_discoveries)

            # 3. Belief Drift Detector
            drift_discoveries = await self._detect_belief_drift(workspace_id)
            discoveries.extend(drift_discoveries)

            # 4. Research Bias Detector
            bias_discoveries = await self._detect_research_bias(workspace_id)
            discoveries.extend(bias_discoveries)

            # 5. Assumption Exposure Detector
            exposure_discoveries = await self._detect_assumption_exposure(workspace_id)
            discoveries.extend(exposure_discoveries)

            # Persist discoveries
            count = 0
            for d in discoveries:
                # Avoid duplicate active discoveries of the same type on the same claim
                existing = self.db.query(Discovery).filter(
                    Discovery.workspace_id == workspace_id,
                    Discovery.type == d.type,
                    Discovery.affected_claim_id == d.affected_claim_id,
                    Discovery.status == DiscoveryStatus.ACTIVE
                ).first()

                if not existing:
                    self.db.add(d)
                    count += 1
            
            self.db.commit()
            logger.info(f"Discovery Engine run complete. Created {count} new discoveries.")
            return count

        except Exception as e:
            logger.error(f"Error running discovery engine: {e}", exc_info=True)
            self.db.rollback()
            return 0

    async def _detect_contradictions(self, workspace_id: str) -> list[Discovery]:
        """Find claims with significant contradicting evidence."""
        claims = self.db.query(Claim).filter(
            Claim.workspace_id == workspace_id,
            Claim.deleted_at.is_(None)
        ).all()

        discoveries = []
        for claim in claims:
            evidence = self.db.query(Evidence).filter(
                Evidence.claim_id == claim.id,
                Evidence.deleted_at.is_(None)
            ).all()

            supporting = [e for e in evidence if e.polarity == EvidencePolarity.SUPPORTING]
            contradicting = [e for e in evidence if e.polarity == EvidencePolarity.CONTRADICTING]

            if not contradicting:
                continue

            supporting_weight = sum(e.weight * e.reliability_score for e in supporting)
            contradicting_weight = sum(e.weight * e.reliability_score for e in contradicting)

            if supporting_weight == 0:
                # If there's only contradicting evidence, it's not a contradiction, just unsupported
                continue

            conflict_ratio = contradicting_weight / supporting_weight

            if conflict_ratio > 0.3:
                severity = min(conflict_ratio, 1.0)
                discoveries.append(Discovery(
                    id=str(uuid.uuid4()),
                    workspace_id=workspace_id,
                    type=DiscoveryType.CONTRADICTION,
                    severity=severity,
                    description=f"Significant contradicting evidence for claim: '{claim.content[:100]}...'",
                    reasoning=f"Supporting weight = {supporting_weight:.2f}, contradicting weight = {contradicting_weight:.2f}. Conflict ratio is {conflict_ratio:.2f} (> 0.3 threshold).",
                    affected_claim_id=claim.id,
                    status=DiscoveryStatus.ACTIVE,
                    detected_at=datetime.utcnow()
                ))

        return discoveries

    async def _detect_stale_evidence(self, workspace_id: str, threshold_days: int = 14) -> list[Discovery]:
        """Find claims supported by old evidence."""
        claims = self.db.query(Claim).filter(
            Claim.workspace_id == workspace_id,
            Claim.deleted_at.is_(None)
        ).all()

        discoveries = []
        for claim in claims:
            evidence = self.db.query(Evidence).filter(
                Evidence.claim_id == claim.id,
                Evidence.deleted_at.is_(None)
            ).all()

            if not evidence:
                continue

            # Find oldest evidence
            valid_evidence = [e for e in evidence if e.created_at is not None]
            if not valid_evidence:
                continue
            oldest = min(valid_evidence, key=lambda e: e.created_at)
            days_old = (datetime.utcnow() - oldest.created_at).days

            if days_old > threshold_days:
                severity = min((days_old - threshold_days) / 180.0, 1.0)
                discoveries.append(Discovery(
                    id=str(uuid.uuid4()),
                    workspace_id=workspace_id,
                    type=DiscoveryType.STALE_EVIDENCE,
                    severity=severity,
                    description=f"Supporting evidence for claim is stale ({days_old} days old)",
                    reasoning=f"Evidence '{oldest.content[:60]}' was created on {oldest.created_at.date()}, exceeding the staleness threshold of {threshold_days} days.",
                    affected_claim_id=claim.id,
                    status=DiscoveryStatus.ACTIVE,
                    detected_at=datetime.utcnow()
                ))

        return discoveries

    async def _detect_belief_drift(self, workspace_id: str) -> list[Discovery]:
        """Find claims where confidence is declining based on history."""
        claims = self.db.query(Claim).filter(
            Claim.workspace_id == workspace_id,
            Claim.deleted_at.is_(None)
        ).all()

        discoveries = []
        for claim in claims:
            ks = claim.knowledge_state
            if not ks:
                continue

            # Look at history for the last 7 updates
            history = self.db.query(KnowledgeStateHistory).filter(
                KnowledgeStateHistory.knowledge_state_id == ks.id
            ).order_by(KnowledgeStateHistory.timestamp.desc()).limit(7).all()

            if len(history) < 2:
                continue

            # Reverse to get chronological order
            history.reverse()
            initial_conf = history[0].confidence_after
            latest_conf = history[-1].confidence_after
            drift = latest_conf - initial_conf

            if drift < -0.05:  # Declining by > 0.05
                severity = min(abs(drift) / 0.5, 1.0)
                discoveries.append(Discovery(
                    id=str(uuid.uuid4()),
                    workspace_id=workspace_id,
                    type=DiscoveryType.BELIEF_DRIFT,
                    severity=severity,
                    description=f"Confidence in claim is drifting downwards",
                    reasoning=f"Confidence decreased from {initial_conf:.2f} to {latest_conf:.2f} over the last {len(history)} updates.",
                    affected_claim_id=claim.id,
                    status=DiscoveryStatus.ACTIVE,
                    detected_at=datetime.utcnow()
                ))

        return discoveries

    async def _detect_research_bias(self, workspace_id: str) -> list[Discovery]:
        """Find claims supported by a single source type (lack of diverse evidence)."""
        claims = self.db.query(Claim).filter(
            Claim.workspace_id == workspace_id,
            Claim.deleted_at.is_(None)
        ).all()

        discoveries = []
        for claim in claims:
            evidence = self.db.query(Evidence).filter(
                Evidence.claim_id == claim.id,
                Evidence.deleted_at.is_(None)
            ).all()

            if len(evidence) < 3:
                continue

            source_types = set(e.type for e in evidence)
            if len(source_types) == 1:
                discoveries.append(Discovery(
                    id=str(uuid.uuid4()),
                    workspace_id=workspace_id,
                    type=DiscoveryType.RESEARCH_BIAS,
                    severity=0.5,
                    description=f"Research bias: Claim depends on a single evidence source type",
                    reasoning=f"All {len(evidence)} pieces of evidence are of type '{list(source_types)[0]}'. Consider seeking other verification methods.",
                    affected_claim_id=claim.id,
                    status=DiscoveryStatus.ACTIVE,
                    detected_at=datetime.utcnow()
                ))

        return discoveries

    async def _detect_assumption_exposure(self, workspace_id: str) -> list[Discovery]:
        """Find high-confidence claims depending on unvalidated assumptions."""
        claims = self.db.query(Claim).filter(
            Claim.workspace_id == workspace_id,
            Claim.deleted_at.is_(None)
        ).all()

        discoveries = []
        for claim in claims:
            ks = claim.knowledge_state
            if not ks or ks.belief_confidence < 0.70:
                continue

            # Check if this claim is linked to any active unvalidated assumptions.
            # In our simplified schema, assumptions are claim records with type='assumption'
            # and low confidence. If they belong to the same workspace and are related.
            # We can run a search for assumptions that contain terms matching the claim.
            assumptions = self.db.query(Claim).filter(
                Claim.workspace_id == workspace_id,
                Claim.type == "assumption",
                Claim.deleted_at.is_(None)
            ).all()

            for assoc in assumptions:
                assoc_ks = assoc.knowledge_state
                if assoc_ks and assoc_ks.belief_confidence < 0.40:
                    # High exposure
                    discoveries.append(Discovery(
                        id=str(uuid.uuid4()),
                        workspace_id=workspace_id,
                        type=DiscoveryType.ASSUMPTION_EXPOSURE,
                        severity=0.70,
                        description=f"Strategic belief depends on unverified assumption: '{assoc.content[:50]}...'",
                        reasoning=f"The claim '{claim.content[:50]}' has high confidence ({ks.belief_confidence:.2f}) but depends on the unverified assumption '{assoc.content[:50]}' which has low confidence ({assoc_ks.belief_confidence:.2f}).",
                        affected_claim_id=claim.id,
                        status=DiscoveryStatus.ACTIVE,
                        detected_at=datetime.utcnow(),
                        metadata_={"assumption_claim_id": assoc.id}
                    ))

        return discoveries
