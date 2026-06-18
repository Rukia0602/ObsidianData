import os

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJECT_ROOT = os.path.dirname(BACKEND_DIR)

UPLOAD_DIR = os.path.join(BACKEND_DIR, "uploads")
CHARTS_DIR = os.path.join(BACKEND_DIR, "charts")
SAMPLE_FILE = os.path.join(PROJECT_ROOT, "data.csv")
ACTIONS_FILE = os.path.join(BACKEND_DIR, "actions.json")
FRONTEND_DIST = os.path.join(PROJECT_ROOT, "frontend", "dist")

MAX_UPLOAD_SIZE = 10 * 1024 * 1024
ENV = os.getenv("ENV", "development")

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(CHARTS_DIR, exist_ok=True)