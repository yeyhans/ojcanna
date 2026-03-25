# backend/api/main.py
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from api.database import create_pool
from api.routers.cead import router as cead_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.pool = await create_pool()
    yield
    await app.state.pool.close()


app = FastAPI(
    title="Observatorio Judicial Cannábico — API",
    version="0.1.0",
    lifespan=lifespan,
)

# Comprimir respuestas GeoJSON (~70% reducción de tamaño)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# CORS abierto en desarrollo
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

app.include_router(cead_router)


@app.get("/health")
async def health():
    return {"status": "ok"}
