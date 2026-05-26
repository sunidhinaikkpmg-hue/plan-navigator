from __future__ import annotations

from typing import Any, Dict, AsyncGenerator
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from fastapi.responses import StreamingResponse
import asyncio
import json

# Router for inclusion in main.py
router = APIRouter()

PROJECT_ID = "adv-lighthouse-plnv"
LOCATION = "europe-west1"
CORPUS_ID = "7991637538768945152"
CORPUS_RESOURCE_NAME = f"projects/{PROJECT_ID}/locations/{LOCATION}/ragCorpora/{CORPUS_ID}"

# Lazily initialised — only created on first request so the server starts
# even if google-cloud-aiplatform is not yet installed / needs upgrading.
_rag_model: Any = None


def _get_model() -> Any:
    global _rag_model
    if _rag_model is not None:
        return _rag_model

    try:
        import vertexai
        from vertexai import rag
        from vertexai.generative_models import GenerativeModel, Tool
    except ImportError as exc:
        raise RuntimeError(
            "google-cloud-aiplatform>=1.62.0 is required for the RAG endpoint. "
            "Run: pip install --upgrade 'google-cloud-aiplatform>=1.62.0'"
        ) from exc

    vertexai.init(project=PROJECT_ID, location=LOCATION)

    rag_corpus = rag.get_corpus(name=CORPUS_RESOURCE_NAME)

    rag_retrieval_config = rag.RagRetrievalConfig(
        top_k=3,
        filter=rag.Filter(vector_distance_threshold=0.5),
    )

    rag_retrieval_tool = Tool.from_retrieval(
        retrieval=rag.Retrieval(
            source=rag.VertexRagStore(
                rag_resources=[rag.RagResource(rag_corpus=rag_corpus.name)],
                rag_retrieval_config=rag_retrieval_config,
            ),
        )
    )

    system_instruction = (
        "You are retrieval-grounded. Use only the content retrieved from the RAG store (the 'nodes'). "
        "Do not use external knowledge or make assumptions. "
        "If the retrieved context does not contain the answer, reply exactly: Document not found."
    )

    _rag_model = GenerativeModel(
        model_name="gemini-2.5-pro",
        tools=[rag_retrieval_tool],
        system_instruction=system_instruction,
    )
    return _rag_model


class RagQueryRequest(BaseModel):
    question: str


def get_rag_answer(question: str) -> dict[str, Any]:
    model = _get_model()
    prompt = (
        f"Answer strictly from the retrieved nodes. If not found, reply exactly: Document not found.\n\n"
        f"Question: {question}"
    )
    response = model.generate_content(prompt)

    answer = response.text
    sources: list[dict[str, str]] = []

    if response.candidates and response.candidates[0].grounding_metadata:
        metadata = response.candidates[0].grounding_metadata
        grounding_chunks = getattr(metadata, "grounding_chunks", [])
        for chunk in grounding_chunks:
            retrieved_context = getattr(chunk, "retrieved_context", None)
            if retrieved_context:
                source_info = {
                    "title": getattr(retrieved_context, "title", "Unknown Document"),
                    "uri": getattr(retrieved_context, "uri", ""),
                }
                if source_info not in sources:
                    sources.append(source_info)

    return {"answer": answer, "sources": sources}


@router.post("/query")
async def query_rag(request: RagQueryRequest) -> StreamingResponse:
    """API endpoint to answer questions grounded in the RAG corpus."""
    try:
        return stream_endpoint(request.question)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

async def stream_rag_answer(rag_query: str) -> AsyncGenerator[Dict[str, Any], None]:
    """Streaming RAG response generator.

    Uses the same sync generate_content(..., stream=True) iterator as chunk_test.py,
    but bridges it to async via a queue so the event loop stays unblocked.
    """
    model = _get_model()

    formatted_query = (
        "Answer strictly from the retrieved nodes. If not found, reply exactly: Document not found.\n\n"
        f"Question: {rag_query}"
    )

    full_answer = ""
    sources: list[dict[str, str]] = []
    input_tokens = 0
    output_tokens = 0

    loop = asyncio.get_event_loop()
    queue: asyncio.Queue = asyncio.Queue()

    # Run the sync streaming iterator in a thread pool, pushing each chunk
    # into the queue so we can await them here without blocking.
    def _produce():
        try:
            for chunk in model.generate_content(formatted_query, stream=True):
                loop.call_soon_threadsafe(queue.put_nowait, chunk)
        finally:
            loop.call_soon_threadsafe(queue.put_nowait, None)  # sentinel

    loop.run_in_executor(None, _produce)

    while True:
        chunk = await queue.get()
        if chunk is None:
            break

        # Extract text (mirrors chunk_test.py's try/except pattern)
        try:
            chunk_text = chunk.text
        except (ValueError, AttributeError):
            chunk_text = ""

        if chunk_text:
            full_answer += chunk_text
            yield {"type": "chunk", "data": chunk_text}
            await asyncio.sleep(0)  # yield control to flush the response

        # Grounding sources (arrive in some chunks, often the last one)
        if chunk.candidates:
            candidate = chunk.candidates[0]
            metadata = getattr(candidate, "grounding_metadata", None)
            if metadata:
                for gc in getattr(metadata, "grounding_chunks", []):
                    retrieved_context = getattr(gc, "retrieved_context", None)
                    if retrieved_context:
                        source_info = {
                            "title": getattr(retrieved_context, "title", "Unknown Document"),
                            "uri": getattr(retrieved_context, "uri", ""),
                        }
                        if source_info not in sources:
                            sources.append(source_info)

        # Token usage (arrives in the final chunk)
        usage = getattr(chunk, "usage_metadata", None)
        if usage:
            input_tokens = getattr(usage, "prompt_token_count", input_tokens)
            output_tokens = getattr(usage, "candidates_token_count", output_tokens)

    yield {
        "type": "final",
        "answer": full_answer,
        "sources": sources,
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
    }

### 
def stream_endpoint(query: str) -> StreamingResponse:
    async def event_stream():
        async for chunk in stream_rag_answer(query):
            # ✅ SSE format (CRITICAL)
            yield f"data: {json.dumps(chunk)}\n\n"
           
            # ✅ tiny await forces flush (VERY IMPORTANT)
            await asyncio.sleep(0)
 
    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # disables nginx buffering
        },
    )