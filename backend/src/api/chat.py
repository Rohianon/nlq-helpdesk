from fastapi import APIRouter, Request, HTTPException

from src.models.chat import ChatRequest, ChatResponse, ConversationHistory, ConversationMessage
from src.rag.pipeline import chat as rag_chat
from src.db.sqlite import get_conversation, delete_conversation

router = APIRouter(tags=["chat"])


@router.post("/chat", response_model=ChatResponse)
async def chat(request: Request, body: ChatRequest):
    triggered = getattr(request.state, "guardrails_triggered", [])
    try:
        return await rag_chat(
            message=body.message,
            session_id=body.session_id,
            guardrails_triggered=triggered,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat error: {str(e)}")


@router.get("/chat/history/{session_id}", response_model=ConversationHistory)
async def get_history(session_id: str):
    rows = await get_conversation(session_id)
    if not rows:
        raise HTTPException(status_code=404, detail="Session not found")

    messages = [
        ConversationMessage(
            role=r["role"],
            content=r["content"],
            timestamp=r["timestamp"],
            citations=r["citations"],
            confidence=r["confidence"],
        )
        for r in rows
    ]
    return ConversationHistory(session_id=session_id, messages=messages)


@router.delete("/chat/history/{session_id}")
async def clear_history(session_id: str):
    await delete_conversation(session_id)
    return {"status": "deleted", "session_id": session_id}
