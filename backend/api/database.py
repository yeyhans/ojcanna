# backend/api/database.py
import os
from typing import AsyncGenerator

import asyncpg
from dotenv import load_dotenv
from fastapi import Request

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

DATABASE_URL: str = os.environ["DATABASE_URL"]


async def create_pool() -> asyncpg.Pool:
    return await asyncpg.create_pool(
        DATABASE_URL,
        min_size=2,
        max_size=10,
        ssl="require",
    )


async def get_pool(request: Request) -> asyncpg.Pool:
    """Dependency: inyecta el pool creado en lifespan."""
    return request.app.state.pool
