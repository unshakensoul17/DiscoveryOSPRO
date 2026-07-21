from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
import logging

# Register all database models
import models

from config import Settings
from routes import claims, evidence, discoveries, auth, workspaces, documents, graph, copilot
from middleware.error_handler import setup_error_handlers
from middleware.logging import setup_logging

# Setup
settings = Settings()
app = FastAPI(title="DiscoveryOS", version="0.1.0")
setup_logging()
setup_error_handlers(app)
logger = logging.getLogger(__name__)

# Middleware — order matters: LAST added = OUTERMOST (first to run)
# TrustedHost must be inner, CORS must be outermost to always inject headers
app.add_middleware(TrustedHostMiddleware, allowed_hosts=["*"])
from fastapi.middleware.gzip import GZipMiddleware
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Routes
from fastapi import APIRouter

api_router = APIRouter(prefix="/v1")
api_router.include_router(auth.router, tags=["auth"])
api_router.include_router(claims.router)
api_router.include_router(evidence.router)
api_router.include_router(discoveries.router)
api_router.include_router(workspaces.router)
api_router.include_router(documents.router)
api_router.include_router(graph.router)
api_router.include_router(copilot.router)


app.include_router(api_router)

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}

@app.get("/")
async def root():
    """Root endpoint."""
    return {"message": "DiscoveryOS API"}

@app.get("/v1/reset-demo")
async def reset_demo():
    from seed_graph_data import seed_mock_data
    ws_id = seed_mock_data()
    return {"message": "Demo environment reset.", "workspace_id": ws_id}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.ENV == "development"
    )