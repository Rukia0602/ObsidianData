from fastapi import APIRouter, Query

from app.config import SAMPLE_FILE, UPLOAD_DIR
from app.services.data_api import (
    MAX_TRANSFORM_ROWS,
    _df_to_json,
    add_calculated_column,
    aggregate_for_chart,
    build_chart_series,
    filter_data,
    get_column_types,
    get_filter_meta,
    get_numeric_stats,
    load_dataframe,
    prepare_table_data,
    pivot_data,
    resolve_data_path,
)

router = APIRouter()


@router.get("/data/{file_id}")
def get_raw_data(
    file_id: str,
    offset: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    sort_col: str | None = Query(None),
    sort_dir: str = Query('asc'),
):
    path = resolve_data_path(file_id, UPLOAD_DIR, SAMPLE_FILE)
    if not path:
        return {"success": False, "error": "文件不存在"}
    try:
        df = load_dataframe(path)
        page_df, page_meta = prepare_table_data(df, offset, limit, sort_col, sort_dir)
        return {
            "success": True,
            "columns": list(df.columns),
            "column_types": get_column_types(df),
            **page_meta,
            "data": _df_to_json(page_df),
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/data/{file_id}/filter-meta")
def filter_meta(file_id: str):
    path = resolve_data_path(file_id, UPLOAD_DIR, SAMPLE_FILE)
    if not path:
        return {"success": False, "error": "文件不存在"}
    try:
        df = load_dataframe(path)
        return {
            "success": True,
            "column_types": get_column_types(df),
            "filter_meta": get_filter_meta(df),
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/data/{file_id}/filter")
def filter_raw_data(file_id: str, body: dict):
    path = resolve_data_path(file_id, UPLOAD_DIR, SAMPLE_FILE)
    if not path:
        return {"success": False, "error": "文件不存在"}
    try:
        df = load_dataframe(path)
        filters = body.get("filters", {})
        filtered = filter_data(df, filters)
        offset = body.get("offset", 0)
        limit = body.get("limit", 100)
        sort_col = body.get("sort_col")
        sort_dir = body.get("sort_dir", "asc")
        page_df, page_meta = prepare_table_data(filtered, offset, limit, sort_col, sort_dir)
        return {
            "success": True,
            **page_meta,
            "data": _df_to_json(page_df),
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/data/{file_id}/pivot")
def pivot_raw_data(file_id: str, body: dict):
    path = resolve_data_path(file_id, UPLOAD_DIR, SAMPLE_FILE)
    if not path:
        return {"success": False, "error": "文件不存在"}
    try:
        df = load_dataframe(path)
        pivoted = pivot_data(df, body)
        total = len(pivoted)
        truncated = total > MAX_TRANSFORM_ROWS
        return {
            "success": True,
            "columns": list(pivoted.columns),
            "row_count": total,
            "truncated": truncated,
            "data": _df_to_json(pivoted.iloc[:MAX_TRANSFORM_ROWS]),
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/data/{file_id}/calculate")
def calc_column(file_id: str, body: dict):
    path = resolve_data_path(file_id, UPLOAD_DIR, SAMPLE_FILE)
    if not path:
        return {"success": False, "error": "文件不存在"}
    try:
        df = load_dataframe(path)
        result = add_calculated_column(df, body)
        total = len(result)
        truncated = total > MAX_TRANSFORM_ROWS
        return {
            "success": True,
            "columns": list(result.columns),
            "column_types": get_column_types(result),
            "row_count": total,
            "truncated": truncated,
            "data": _df_to_json(result.iloc[:MAX_TRANSFORM_ROWS]),
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/data/{file_id}/aggregate")
def aggregate_data(file_id: str, body: dict):
    path = resolve_data_path(file_id, UPLOAD_DIR, SAMPLE_FILE)
    if not path:
        return {"success": False, "error": "文件不存在"}
    try:
        df = load_dataframe(path)
        filters = body.get("filters", {})
        if filters:
            df = filter_data(df, filters)
        x_col = body.get("x_col")
        y_col = body.get("y_col")
        aggfunc = body.get("aggfunc", "sum")
        if x_col and y_col:
            agg = aggregate_for_chart(df, x_col, y_col, aggfunc)
            return {"success": True, "data": _df_to_json(agg)}
        return {"success": True, "data": _df_to_json(df)}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/data/{file_id}/chart-series")
def chart_series(file_id: str, body: dict):
    """服务端图表序列：支持筛选 + 聚合，减轻前端计算。"""
    path = resolve_data_path(file_id, UPLOAD_DIR, SAMPLE_FILE)
    if not path:
        return {"success": False, "error": "文件不存在"}
    try:
        df = load_dataframe(path)
        filters = body.get("filters", {})
        if filters:
            df = filter_data(df, filters)
        series = build_chart_series(df, body)
        if not series.get("ready"):
            return {"success": False, "error": series.get("reason", "图表数据构建失败")}
        return {"success": True, "series": series, "filtered_row_count": len(df)}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/data/{file_id}/stats/{column}")
def column_stats(file_id: str, column: str):
    path = resolve_data_path(file_id, UPLOAD_DIR, SAMPLE_FILE)
    if not path:
        return {"success": False, "error": "文件不存在"}
    try:
        df = load_dataframe(path)
        stats = get_numeric_stats(df, column)
        return {"success": True, "stats": stats}
    except Exception as e:
        return {"success": False, "error": str(e)}