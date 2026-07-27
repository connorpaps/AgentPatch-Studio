import os
from abc import ABC, abstractmethod
from typing import Any, Dict, Optional

from fastapi import HTTPException, status


class LLMProvider(ABC):
    @abstractmethod
    def complete(self, messages: list, model: Optional[str] = None, temperature: float = 0.2) -> Dict[str, Any]:
        ...


class OpenAIProvider(LLMProvider):
    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        import openai

        self.client = openai.OpenAI(api_key=api_key)
        self.model = model or os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    def complete(self, messages: list, model: Optional[str] = None, temperature: float = 0.2) -> Dict[str, Any]:
        try:
            response = self.client.chat.completions.create(
                model=model or self.model,
                messages=messages,
                temperature=temperature,
            )
            return {
                "content": response.choices[0].message.content,
                "model": response.model,
                "usage": response.usage.model_dump() if response.usage else None,
            }
        except Exception as exc:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"LLM call failed: {exc}") from exc


class MockProvider(LLMProvider):
    """Deterministic provider for tests and zero-cost demos."""

    def complete(self, messages: list, model: Optional[str] = None, temperature: float = 0.2) -> Dict[str, Any]:
        last = messages[-1] if messages else {}
        prompt = str(last.get("content", ""))

        # Simple keyword-based deterministic answers for the support-policy demo.
        lowered = prompt.lower()
        if "refund" in lowered and "annual" in lowered:
            answer = "Yes, annual plans are refundable within 30 days."
        elif "refund" in lowered:
            answer = "Please consult the latest refund policy."
        elif "compare" in lowered or "divergence" in lowered:
            answer = "The runs diverge at the retrieval step."
        else:
            answer = "This is a mock response for testing."

        return {
            "content": answer,
            "model": model or "mock",
            "usage": {"prompt_tokens": 10, "completion_tokens": 5, "total_tokens": 15},
        }


def get_llm_provider() -> LLMProvider:
    mode = os.getenv("LLM_PROVIDER", "mock").lower()
    if mode == "openai":
        return OpenAIProvider()
    if mode == "mock":
        return MockProvider()
    raise ValueError(f"Unknown LLM_PROVIDER: {mode}. Use 'openai' or 'mock'.")
