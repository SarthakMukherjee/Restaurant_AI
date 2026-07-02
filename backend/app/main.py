"""
AI-Powered Restaurant Management System — FastAPI application entrypoint.
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from app.core.config import settings
from app.core.database import AsyncSessionLocal, Base, engine
from app.core.security import hash_password
from app.models.user import User, UserRole
from app.routers import admin, auth, feedback, menu, recommendation, reservation

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def _bootstrap_first_admin() -> None:
    """Creates a default admin account on first run, if none exists."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.role == UserRole.ADMIN))
        if result.scalar_one_or_none() is not None:
            return

        admin_user = User(
            full_name=settings.FIRST_ADMIN_NAME,
            email=settings.FIRST_ADMIN_EMAIL,
            hashed_password=hash_password(settings.FIRST_ADMIN_PASSWORD),
            role=UserRole.ADMIN,
        )
        db.add(admin_user)
        await db.commit()
        logger.info("Bootstrapped default admin account: %s", settings.FIRST_ADMIN_EMAIL)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables (MVP convenience — use Alembic migrations in production)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await _bootstrap_first_admin()
    logger.info("%s started.", settings.APP_NAME)
    yield
    logger.info("Shutting down.")


app = FastAPI(
    title=settings.APP_NAME,
    description="MVP demonstrating AI-enabled restaurant operations: menu recommendations, "
    "reservation intent recognition, and feedback sentiment analysis.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(menu.router)
app.include_router(recommendation.router)
app.include_router(reservation.router)
app.include_router(feedback.router)
app.include_router(admin.router)


@app.get("/", tags=["Health"])
async def root():
    return {"status": "ok", "service": settings.APP_NAME}


@app.get("/api/health", tags=["Health"])
async def health_check():
    return {"status": "healthy"}
