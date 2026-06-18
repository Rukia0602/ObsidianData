import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import CHARTS_DIR, ENV, FRONTEND_DIST
from app.routers import actions, analyze, charts, data, process, upload

app = FastAPI(
    title="ObsidianData API",
    description="黑曜数据 — CSV/Excel 规则引擎洞察平台",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router, prefix="/api", tags=["upload"])
app.include_router(charts.router, prefix="/api", tags=["charts"])
app.include_router(analyze.router, prefix="/api", tags=["analyze"])
app.include_router(process.router, prefix="/api", tags=["process"])
app.include_router(actions.router, prefix="/api", tags=["actions"])
app.include_router(data.router, prefix="/api", tags=["data"])

app.mount("/charts", StaticFiles(directory=CHARTS_DIR), name="charts")

if ENV == "production" and os.path.isdir(FRONTEND_DIST):
    app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="spa")