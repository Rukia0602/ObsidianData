import csv
import os

from fastapi import APIRouter
from pydantic import BaseModel

from app.config import CHARTS_DIR, SAMPLE_FILE, UPLOAD_DIR
from app.services.chart_engine import generate_charts
from app.services.data_api import load_dataframe, resolve_data_path
from app.utils.serializers import df_to_rows, filter_insights

router = APIRouter()


class ChartRequest(BaseModel):
    file_id: str


@router.post("/chart")
def create_chart(body: ChartRequest):
    file_id = body.file_id
    input_path = resolve_data_path(file_id, UPLOAD_DIR, SAMPLE_FILE)
    if not input_path:
        return {"success": False, "error": "文件不存在或已过期，请重新上传"}

    output_dir = os.path.join(CHARTS_DIR, file_id)
    try:
        df = load_dataframe(input_path)
        charts, insights, charts_meta = generate_charts(input_path, output_dir, df=df)
    except Exception as e:
        return {"success": False, "error": f"图表生成失败: {str(e)}"}

    chart_urls = {key: f"/charts/{rel_path.replace(chr(92), '/')}" for key, rel_path in charts.items()}

    return {
        "success": True,
        "charts": chart_urls,
        "charts_meta": charts_meta,
        "insights": filter_insights(insights),
    }


@router.get("/sample")
def sample_data():
    if not os.path.exists(SAMPLE_FILE):
        return {"success": False, "error": "示例数据文件不存在"}

    file_id = "sample"
    output_dir = os.path.join(CHARTS_DIR, file_id)

    preview_rows = []
    columns = []
    row_count = 0
    try:
        with open(SAMPLE_FILE, "r", encoding="utf-8") as f:
            reader = csv.reader(f)
            columns = next(reader)
            row_count = 1
            for row in reader:
                if row_count <= 11:
                    preview_rows.append(row)
                row_count += 1
        row_count -= 1
    except Exception as e:
        return {"success": False, "error": f"读取示例数据失败: {str(e)}"}

    try:
        df = load_dataframe(SAMPLE_FILE)
        charts, insights, charts_meta = generate_charts(SAMPLE_FILE, output_dir, df=df)
    except Exception as e:
        return {"success": False, "error": f"图表生成失败: {str(e)}"}

    chart_urls = {key: f"/charts/{rel_path.replace(chr(92), '/')}" for key, rel_path in charts.items()}
    file_size = os.path.getsize(SAMPLE_FILE)

    return {
        "success": True,
        "file_id": file_id,
        "file_name": "data.csv",
        "row_count": row_count,
        "col_count": len(columns),
        "file_size": file_size,
        "columns": columns,
        "preview_rows": preview_rows,
        "charts": chart_urls,
        "charts_meta": charts_meta,
        "insights": filter_insights(insights),
    }