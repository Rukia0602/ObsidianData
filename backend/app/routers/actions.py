import datetime
import json

from fastapi import APIRouter
from pydantic import BaseModel

from app.config import ACTIONS_FILE
from app.services.ai_analyzer import (
    bulk_create_actions,
    create_action,
    delete_action,
    get_all_actions,
    update_action,
)

router = APIRouter()


class ActionCreateBody(BaseModel):
    session_id: str = "default"
    action: dict = {}


class ActionUpdateBody(BaseModel):
    session_id: str = "default"
    updates: dict = {}


class StepToggleBody(BaseModel):
    session_id: str = "default"
    step_index: int | None = None


class BulkActionBody(BaseModel):
    session_id: str = "default"
    actions: list[dict] = []


@router.get("/actions")
def list_actions(session_id: str = "default"):
    all_actions = get_all_actions()
    return {"success": True, "actions": all_actions.get(session_id, [])}


@router.post("/actions")
def add_action(body: ActionCreateBody):
    result = create_action(body.session_id, body.action)
    return {"success": True, "action": result}


@router.post("/actions/bulk")
def bulk_add_actions(body: BulkActionBody):
    result = bulk_create_actions(body.session_id, body.actions)
    return {"success": True, "actions": result}


@router.put("/actions/{action_id}")
def edit_action(action_id: str, body: ActionUpdateBody):
    result = update_action(body.session_id, action_id, body.updates)
    if result is None:
        return {"success": False, "error": "操作项不存在"}
    return {"success": True, "action": result}


@router.delete("/actions/{action_id}")
def remove_action(action_id: str, session_id: str = "default"):
    ok = delete_action(session_id, action_id)
    if not ok:
        return {"success": False, "error": "操作项不存在"}
    return {"success": True}


@router.put("/actions/{action_id}/step")
def toggle_step(action_id: str, body: StepToggleBody):
    all_actions = get_all_actions()
    actions_list = all_actions.get(body.session_id, [])
    target = None
    for a in actions_list:
        if a["id"] == action_id:
            target = a
            break
    if not target:
        return {"success": False, "error": "操作项不存在"}

    steps = target.get("steps", [])
    step_index = body.step_index
    if step_index is not None and 0 <= step_index < len(steps):
        current = steps[step_index]
        if current.startswith("✓"):
            steps[step_index] = current[1:]
        else:
            steps[step_index] = "✓" + current
        target["steps"] = steps
        completed = sum(1 for s in steps if s.startswith("✓"))
        total = len(steps)
        target["progress"] = round(completed / total * 100) if total > 0 else 0
        if target["progress"] >= 100:
            target["status"] = "completed"
        elif target["progress"] > 0:
            target["status"] = "in_progress"
        else:
            target["status"] = "pending"
        target["updated_at"] = datetime.datetime.now().isoformat()
        all_actions[body.session_id] = actions_list
        with open(ACTIONS_FILE, "w", encoding="utf-8") as f:
            json.dump(all_actions, f, ensure_ascii=False, indent=2)

    return {"success": True, "action": target}