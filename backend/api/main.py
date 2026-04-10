# backend/api/main.py
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from api.database import create_pool
from api.routers.cead import load_geom_cache, prewarm_cache, router as cead_router
from api.routers.dpp import router as dpp_router
from api.routers.pdi import router as pdi_router
from api.routers.embudo import router as embudo_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.pool = await create_pool()
    app.state.geom_cache = await load_geom_cache(app.state.pool)
    await prewarm_cache(app.state.pool, app.state.geom_cache)
    yield
    await app.state.pool.close()


app = FastAPI(
    title="Observatorio Judicial Cannábico — API",
    version="0.1.0",
    lifespan=lifespan,
)

# Comprimir respuestas GeoJSON (~70% reducción de tamaño)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# CORS: en producción setear ALLOWED_ORIGINS=https://tu-app.vercel.app
_raw_origins = os.getenv("ALLOWED_ORIGINS", "*")
allowed_origins = [o.strip() for o in _raw_origins.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_methods=["GET"],
    allow_headers=["*"],
)

app.include_router(cead_router)
app.include_router(dpp_router)
app.include_router(pdi_router)
app.include_router(embudo_router)


@app.get("/health")
async def health():
    return {"status": "ok"}
