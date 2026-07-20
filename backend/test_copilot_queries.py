import os
import sys
import asyncio
import json

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
from services.graph_rag_service import GraphRAGService
from services.graph_service import GraphService

async def test_copilot():
    db = SessionLocal()
    ws_id = "ws-1"
    
    print("\n=======================================================")
    print(" 1. TESTING KNOWLEDGE GRAPH STRUCTURE & ANALYTICS")
    print("=======================================================")
    
    graph_service = GraphService(db)
    analytics = graph_service.calculate_analytics(ws_id)
    print(f"Total Nodes: {analytics['total_nodes']}")
    print(f"Total Edges: {analytics['total_edges']}")
    print(f"Top Pillar Beliefs: {json.dumps(analytics['top_pillar_beliefs'], indent=2)}")
    print(f"Isolated Assumptions: {json.dumps(analytics['isolated_assumptions'], indent=2)}")
    
    rag_service = GraphRAGService(db)
    
    queries = [
        "What evidence contradicts our subscription pricing strategy belief?",
        "Which unvalidated assumptions risk our enterprise customer migration?",
        "What impact does the interactive onboarding flow redesign have on user retention?"
    ]
    
    for i, q in enumerate(queries, 1):
        print(f"\n=======================================================")
        print(f" QUERY {i}: '{q}'")
        print("=======================================================")
        res = await rag_service.answer_question(ws_id, q)
        print(f"ANSWER:\n{res['answer']}\n")
        print(f"CITATIONS ({len(res['citations'])} nodes):")
        for c in res['citations']:
            print(f"  - [{c['type']}] ID: {c['id']} -> {c['label']}")
        print(f"SUBGRAPH EDGES ({len(res['subgraph']['edges'])} edges):")
        for e in res['subgraph']['edges']:
            print(f"  - {e['source']} --{e['relation_type']}--> {e['target']}")

    db.close()

if __name__ == "__main__":
    asyncio.run(test_copilot())
