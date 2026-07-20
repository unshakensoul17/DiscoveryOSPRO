import logging
import uuid
import networkx as nx
from typing import Dict, List, Any, Optional
from sqlalchemy.orm import Session
from models.claim import Claim
from models.evidence import Evidence, EvidencePolarity
from models.document import Document
from models.relationship import ClaimRelationship

logger = logging.getLogger(__name__)

class GraphService:
    def __init__(self, db: Session):
        self.db = db

    def sync_workspace_relationships(self, workspace_id: str) -> int:
        """Auto-populate baseline relationships for workspace claims & evidence if missing."""
        created = 0
        claims = self.db.query(Claim).filter(
            Claim.workspace_id == workspace_id,
            Claim.deleted_at.is_(None)
        ).all()

        evidence_list = self.db.query(Evidence).filter(
            Evidence.workspace_id == workspace_id,
            Evidence.deleted_at.is_(None)
        ).all()

        existing_rels = self.db.query(ClaimRelationship).filter(
            ClaimRelationship.workspace_id == workspace_id
        ).all()

        existing_pairs = {(r.source_id, r.target_id, r.relation_type) for r in existing_rels}

        new_rels = []

        # 1. Link Evidence -> Claim (SUPPORTS / CONTRADICTS / RELATED)
        for ev in evidence_list:
            if ev.claim_id:
                rel_type = "SUPPORTS" if ev.polarity == EvidencePolarity.SUPPORTING else (
                    "CONTRADICTS" if ev.polarity == EvidencePolarity.CONTRADICTING else "RELATED_TO"
                )
                if (ev.id, ev.claim_id, rel_type) not in existing_pairs:
                    new_rels.append(ClaimRelationship(
                        id=str(uuid.uuid4()),
                        workspace_id=workspace_id,
                        source_id=ev.id,
                        source_type="evidence",
                        target_id=ev.claim_id,
                        target_type="claim",
                        relation_type=rel_type,
                        weight=ev.reliability_score or 0.5,
                        metadata_={"weight": ev.weight}
                    ))
                    existing_pairs.add((ev.id, ev.claim_id, rel_type))

            # 2. Link Evidence -> Document (EXTRACTED_FROM)
            if ev.source_document:
                if (ev.id, ev.source_document, "EXTRACTED_FROM") not in existing_pairs:
                    new_rels.append(ClaimRelationship(
                        id=str(uuid.uuid4()),
                        workspace_id=workspace_id,
                        source_id=ev.id,
                        source_type="evidence",
                        target_id=ev.source_document,
                        target_type="document",
                        relation_type="EXTRACTED_FROM",
                        weight=1.0
                    ))
                    existing_pairs.add((ev.id, ev.source_document, "EXTRACTED_FROM"))

        # 3. Link Claim -> Document (EXTRACTED_FROM)
        for c in claims:
            if c.extracted_from_document:
                if (c.id, c.extracted_from_document, "EXTRACTED_FROM") not in existing_pairs:
                    new_rels.append(ClaimRelationship(
                        id=str(uuid.uuid4()),
                        workspace_id=workspace_id,
                        source_id=c.id,
                        source_type="claim",
                        target_id=c.extracted_from_document,
                        target_type="document",
                        relation_type="EXTRACTED_FROM",
                        weight=1.0
                    ))
                    existing_pairs.add((c.id, c.extracted_from_document, "EXTRACTED_FROM"))

        if new_rels:
            self.db.add_all(new_rels)
            self.db.commit()
            created = len(new_rels)
            logger.info(f"Auto-synced {created} relationships into knowledge graph for workspace {workspace_id}")

        return created

    def build_workspace_graph(self, workspace_id: str) -> nx.DiGraph:
        """Construct NetworkX DiGraph for a workspace with rich node and edge attributes."""
        self.sync_workspace_relationships(workspace_id)
        G = nx.DiGraph()

        # Add Claim Nodes
        claims = self.db.query(Claim).filter(
            Claim.workspace_id == workspace_id,
            Claim.deleted_at.is_(None)
        ).all()

        for c in claims:
            G.add_node(
                c.id,
                node_type="claim",
                label=c.content[:60] + "..." if len(c.content) > 60 else c.content,
                content=c.content,
                claim_type=c.type.value if hasattr(c.type, "value") else str(c.type),
                status=c.status.value if hasattr(c.status, "value") else str(c.status),
                confidence=c.confidence,
                staleness=c.staleness_score,
                drift=c.drift_indicator
            )

        # Add Evidence Nodes
        evidence_list = self.db.query(Evidence).filter(
            Evidence.workspace_id == workspace_id,
            Evidence.deleted_at.is_(None)
        ).all()

        for ev in evidence_list:
            G.add_node(
                ev.id,
                node_type="evidence",
                label=ev.content[:60] + "..." if len(ev.content) > 60 else ev.content,
                content=ev.content,
                polarity=ev.polarity.value if hasattr(ev.polarity, "value") else str(ev.polarity),
                reliability=ev.reliability_score,
                evidence_type=ev.type.value if hasattr(ev.type, "value") else str(ev.type)
            )

        # Add Document Nodes
        docs = self.db.query(Document).filter(
            Document.workspace_id == workspace_id,
            Document.deleted_at.is_(None)
        ).all()

        for d in docs:
            G.add_node(
                d.id,
                node_type="document",
                label=d.title,
                title=d.title,
                file_type=d.file_type
            )

        # Add Edges
        relationships = self.db.query(ClaimRelationship).filter(
            ClaimRelationship.workspace_id == workspace_id
        ).all()

        for rel in relationships:
            if G.has_node(rel.source_id) and G.has_node(rel.target_id):
                G.add_edge(
                    rel.source_id,
                    rel.target_id,
                    id=rel.id,
                    relation_type=rel.relation_type,
                    weight=rel.weight or 0.5,
                    metadata=rel.metadata_
                )

        return G

    def get_subgraph(self, workspace_id: str, node_id: str, max_hops: int = 2) -> Dict[str, Any]:
        """Extract a k-hop subgraph around a target node."""
        G = self.build_workspace_graph(workspace_id)
        if not G.has_node(node_id):
            return {"nodes": [], "edges": []}

        # Ego graph traversal
        sub_g = nx.ego_graph(G, node_id, radius=max_hops, undirected=True)

        nodes = []
        for n, data in sub_g.nodes(data=True):
            node_info = {"id": n}
            node_info.update(data)
            nodes.append(node_info)

        edges = []
        for u, v, data in sub_g.edges(data=True):
            edge_info = {"source": u, "target": v}
            edge_info.update(data)
            edges.append(edge_info)

        return {"nodes": nodes, "edges": edges}

    def calculate_analytics(self, workspace_id: str) -> Dict[str, Any]:
        """Calculate PageRank, degree centrality, and anomaly metrics for knowledge graph."""
        G = self.build_workspace_graph(workspace_id)
        if len(G) == 0:
            return {
                "total_nodes": 0,
                "total_edges": 0,
                "pagerank": {},
                "top_pillar_beliefs": [],
                "isolated_assumptions": []
            }

        try:
            pagerank = nx.pagerank(G, weight="weight") if len(G) > 1 else {n: 1.0 for n in G.nodes()}
        except Exception:
            pagerank = nx.degree_centrality(G) if len(G) > 0 else {}

        # Find top pillar claims
        claim_nodes = [n for n, data in G.nodes(data=True) if data.get("node_type") == "claim"]
        ranked_claims = sorted(claim_nodes, key=lambda n: pagerank.get(n, 0), reverse=True)

        top_pillars = []
        for cid in ranked_claims[:5]:
            node_data = G.nodes[cid]
            top_pillars.append({
                "id": cid,
                "content": node_data.get("content"),
                "pagerank_score": round(pagerank.get(cid, 0), 4),
                "confidence": node_data.get("confidence", 0.5)
            })

        # Find isolated assumptions (in-degree == 0, type == assumption)
        isolated_assumptions = []
        for cid in claim_nodes:
            node_data = G.nodes[cid]
            if node_data.get("claim_type") == "assumption" and G.in_degree(cid) == 0:
                isolated_assumptions.append({
                    "id": cid,
                    "content": node_data.get("content"),
                    "confidence": node_data.get("confidence", 0.5)
                })

        return {
            "total_nodes": G.number_of_nodes(),
            "total_edges": G.number_of_edges(),
            "claim_count": len(claim_nodes),
            "top_pillar_beliefs": top_pillars,
            "isolated_assumptions": isolated_assumptions
        }
