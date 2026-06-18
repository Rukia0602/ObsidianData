import os
import shutil

from fastapi import APIRouter
from pydantic import BaseModel

from app.config import SAMPLE_FILE, UPLOAD_DIR
from app.services.ai_analyzer import analyze
from app.services.data_api import load_dataframe, resolve_data_path

router = APIRouter()


class AnalyzeRequest(BaseModel):
    file_id: str


@router.post("/analyze")
def analyze_data(body: AnalyzeRequest):
    file_id = body.file_id

    if file_id == "sample" and not os.path.exists(os.path.join(UPLOAD_DIR, "sample.csv")):
        shutil.copy(SAMPLE_FILE, os.path.join(UPLOAD_DIR, "sample.csv"))

    input_path = resolve_data_path(file_id, UPLOAD_DIR, SAMPLE_FILE)
    if not input_path or not os.path.exists(input_path):
        return {"success": False, "error": "文件不存在或已过期，请重新上传"}

    try:
        df = load_dataframe(input_path)
        result = analyze(df=df)
    except Exception as e:
        return {"success": False, "error": f"AI分析失败: {str(e)}"}

    return {"success": True, "analysis": result}