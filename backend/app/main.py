from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import Base, engine
from app.api import auth, projects, register, search, rules, candidates, lottery, apartments, reports


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables on startup (safe to call on every start — idempotent)
    Base.metadata.create_all(bind=engine)
    yield
    # Cleanup on shutdown (none needed)


app = FastAPI(
    title="Ezra VaBitaron — Affordable Housing Lottery API",
    description="Full-stack affordable housing lottery system for Tel Aviv-Yafo Municipality.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all routers
app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(register.router)
app.include_router(search.router)
app.include_router(rules.router)
app.include_router(candidates.router)
app.include_router(lottery.router)
app.include_router(apartments.router)
app.include_router(reports.router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "lottery-api"}
