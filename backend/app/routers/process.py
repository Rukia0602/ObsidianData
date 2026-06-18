import os
import shutil

from fastapi import APIRouter
from pydantic import BaseModel

from app.config import CHARTS_DIR, SAMPLE_FILE, UPLOAD_DIR
from app.services.ai_analyzer import analyze
from app.services.chart_engine import generate_charts
from app.services.data_api import load_dataframe, resolve_data_path
from app.utils.serializers import df_to_rows, filter_insights

router = APIRouter()


class ProcessRequest(BaseModel):
    file_id: str


def _prepare_sample_copy(file_id: str):
    if file_id == "sample":
        sample_copy = os.path.join(UPLOAD_DIR, "sample.csv")
        if not os.path.exists(sample_copy):
            shutil.copy(SAMPLE_FILE, sample_copy)


def _chart_urls(charts: dict) -> dict:
    return {key: f"/charts/{rel_path.replace(chr(92), '/')}" for key, rel_path in charts.items()}


def _sample_file_info(file_id: str, input_path: str, df) -> dict:
    return {
        "file_id": file_id,
        "file_name": "data.csv",
        "row_count": len(df),
        "col_count": len(df.columns),
        "file_size": os.path.getsize(input_path),
        "columns": [str(c) for c in df.columns],
        "preview_rows": df_to_rows(df.head(11)),
    }


@router.post("/process")
def process_file(body: ProcessRequest):
    """一次读盘：合并静态图生成 + 规则引擎分析。"""
    file_id = body.file_id
    _prepare_sample_copy(file_id)

    input_path = resolve_data_path(file_id, UPLOAD_DIR, SAMPLE_FILE)
    if not input_path or not os.path.exists(input_path):
        return {"success": False, "error": "文件不存在或已过期，请重新上传"}

    output_dir = os.path.join(CHARTS_DIR, file_id)
    try:
        df = load_dataframe(input_path)
        charts, insights, charts_meta = generate_charts(input_path, output_dir, df=df)
        analysis = analyze(df=df)
    except Exception as e:
        return {"success": False, "error": f"处理失败: {str(e)}"}

    payload = {
        "success": True,
        "charts": _chart_urls(charts),
        "charts_meta": charts_meta,
        "insights": filter_insights(insights),
        "analysis": analysis,
    }
    if file_id == "sample":
        payload["file_info"] = _sample_file_info(file_id, input_path, df)
    return payload