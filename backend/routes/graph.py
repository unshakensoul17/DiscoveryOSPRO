from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import uuid

from database import get_db
from dependencies import get_current_user, verify_workspace
from services.graph_service import GraphService
from models.relationship import ClaimRelationship

router = APIRouter(
    prefix="/workspaces/{workspace_id}/graph",
    tags=["knowledge-graph"],
    dependencies=[Depends(verify_workspace)]
)

class CreateRelationshipRequest(BaseModel):
    source_id: str
    source_type: str
    target_id: str
    target_type: str
    relation_type: str  # SUPPORTS, CONTRADICTS, EXPOSES_ASSUMPTION, MEASURED_BY, EXTRACTED_FROM, RELATED_TO
    weight: Optional[float] = 0.5
    metadata: Optional[Dict[str, Any]] = None

@router.get("")
async def get_workspace_graph(
    workspace_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Retrieve full Knowledge Graph (nodes & edges) for a workspace."""
    service = GraphService(db)
    G = service.build_workspace_graph(workspace_id)

    nodes = []
    for n, data in G.nodes(data=True):
        node_info = {"id": n}
        node_info.update(data)
        nodes.append(node_info)

    edges = []
    for u, v, data in G.edges(data=True):
        edge_info = {"source": u, "target": v}
        edge_info.update(data)
        edges.append(edge_info)

    return {
        "workspace_id": workspace_id,
        "nodes": nodes,
        "edges": edges,
        "total_nodes": len(nodes),
        "total_edges": len(edges)
    }

@router.get("/analytics")
async def get_graph_analytics(
    workspace_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get PageRank centrality scores, pillar beliefs, and isolated assumption alerts."""
    service = GraphService(db)
    return service.calculate_analytics(workspace_id)

@router.post("/relationships")
async def create_relationship(
    workspace_id: str,
    req: CreateRelationshipRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Create a new custom edge/relationship between graph nodes."""
    rel = ClaimRelationship(
        id=str(uuid.uuid4()),
        workspace_id=workspace_id,
        source_id=req.source_id,
        source_type=req.source_type,
        target_id=req.target_id,
        target_type=req.target_type,
        relation_type=req.relation_type,
        weight=req.weight or 0.5,
        metadata_=req.metadata
    )
    db.add(rel)
    db.commit()
    db.refresh(rel)

    return {
        "id": rel.id,
        "source_id": rel.source_id,
        "target_id": rel.target_id,
        "relation_type": rel.relation_type,
        "weight": rel.weight
    }
