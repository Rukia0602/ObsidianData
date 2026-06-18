import os
import uuid

from fastapi import APIRouter, File, UploadFile

from app.config import MAX_UPLOAD_SIZE, UPLOAD_DIR
from app.services.data_api import (
    _read_csv_safe,
    _read_excel_safe,
    _read_data_safe,
    _df_to_json,
    get_column_types,
)
from app.utils.serializers import df_to_rows

router = APIRouter()

MULTI_UPLOAD_ROW_LIMIT = 1000


@router.post("/upload")
def upload_file(file: UploadFile = File(...)):
    if not file.filename:
        return {"success": False, "error": "文件名为空"}

    filename = file.filename
    ext = os.path.splitext(filename)[1].lower()

    if ext not in (".csv", ".xlsx", ".xls"):
        return {"success": False, "error": "仅支持 CSV、xlsx、xls 文件"}

    file_id = str(uuid.uuid4())
    save_path = os.path.join(UPLOAD_DIR, f"{file_id}{ext}")

    try:
        content = file.file.read()
        if len(content) > MAX_UPLOAD_SIZE:
            return {"success": False, "error": "文件大小不能超过 10MB"}
        with open(save_path, "wb") as f:
            f.write(content)
    except Exception as e:
        return {"success": False, "error": f"文件保存失败: {str(e)}"}

    try:
        if ext == ".csv":
            df = _read_csv_safe(save_path)
        else:
            df = _read_excel_safe(save_path)
    except ValueError as e:
        return {"success": False, "error": str(e)}
    except Exception as e:
        return {"success": False, "error": f"文件读取失败: {str(e)}"}

    if df.empty:
        return {"success": False, "error": "文件为空或没有有效数据"}

    columns = [str(c).strip() for c in df.columns]
    df.columns = columns
    preview_rows = df_to_rows(df.head(11))
    row_count = len(df)
    file_size = os.path.getsize(save_path)

    return {
        "success": True,
        "file_id": file_id,
        "file_name": filename,
        "row_count": row_count,
        "col_count": len(columns),
        "file_size": file_size,
        "columns": columns,
        "preview_rows": preview_rows,
    }


@router.post("/multi-upload")
def multi_upload(files: list[UploadFile] = File(...)):
    if not files or not files[0].filename:
        return {"success": False, "error": "文件名为空"}

    datasets = []
    for f in files:
        if not f.filename:
            continue
        ext = os.path.splitext(f.filename)[1].lower()
        if ext not in (".csv", ".xlsx", ".xls"):
            continue
        file_id = str(uuid.uuid4())
        save_path = os.path.join(UPLOAD_DIR, f"{file_id}{ext}")
        content = f.file.read()
        if len(content) > MAX_UPLOAD_SIZE:
            datasets.append({
                "file_name": f.filename,
                "error": "文件大小不能超过 10MB",
            })
            continue
        with open(save_path, "wb") as out:
            out.write(content)
        try:
            df = _read_data_safe(save_path)
            full_count = len(df)
            truncated = full_count > MULTI_UPLOAD_ROW_LIMIT
            datasets.append({
                "file_id": file_id,
                "file_name": f.filename,
                "row_count": full_count,
                "truncated": truncated,
                "columns": list(df.columns),
                "column_types": get_column_types(df),
                "data": _df_to_json(df.head(MULTI_UPLOAD_ROW_LIMIT)),
            })
        except Exception as e:
            datasets.append({"file_name": f.filename, "error": str(e)})

    return {"success": True, "datasets": datasets}