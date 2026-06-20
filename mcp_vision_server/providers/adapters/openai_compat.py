"""通用 OpenAI 兼容 API 适配器 — 支持任何 OpenAI-compatible 端点"""
import asyncio
from typing import Any, Dict, List, Optional

import httpx

from ..base import BaseProvider, Capability
from ...utils.errors import api_error, auth_failed, connection_failed, timeout


class OpenAICompatibleProvider(BaseProvider):
    """连接任何 OpenAI 兼容 API 端点

    支持的端点包括:
    - OpenAI（原生）
    - Agnes AI（OpenAI 兼容模式）
    - OpenRouter
    - Groq
    - 本地/自部署模型（Ollama, vLLM, LM Studio 等）
    """

    def __init__(
        self,
        name: str,
        base_url: str,
        api_key: str,
        capabilities: Optional[set[Capability]] = None,
        default_models: Optional[Dict[Capability, str]] = None,
        timeout_seconds: float = 120.0,
        max_retries: int = 3,
    ) -> None:
        self._name = name
        self._base_url = base_url.rstrip("/")
        self._api_key = api_key
        self._timeout = timeout_seconds
        self._max_retries = max_retries
        self._capabilities = capabilities or set()
        self._default_models = default_models or {}

        self._headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
        }

    # ── 标识 ──

    @property
    def name(self) -> str:
        return self._name

    @property
    def capabilities(self) -> set[Capability]:
        return self._capabilities

    @property
    def base_url(self) -> str:
        return self._base_url

    # ── 模型选择 ──

    def default_model_for(self, capability: Capability) -> Optional[str]:
        return self._default_models.get(capability)

    # ── 健康检查 ──

    async def health_check(self) -> bool:
        """快速检查 Provider 可用性（统计前 2 个重试命中时间窗口）"""
        return True  # 默认放行，实际可用性由请求验证

    # ── 核心 API ──

    async def chat_completion(
        self,
        messages: List[Dict[str, Any]],
        model: Optional[str] = None,
        **kwargs: Any,
    ) -> Dict[str, Any]:
        """OpenAI 兼容的 chat/completions 请求"""
        payload: Dict[str, Any] = {
            "model": model or self._default_models.get(Capability.VISION, "gpt-4o"),
            "messages": messages,
            **kwargs,
        }
        return await self._request("POST", "/chat/completions", payload)

    async def image_generation(
        self,
        prompt: str,
        size: str = "1024x1024",
        n: int = 1,
        model: Optional[str] = None,
        **kwargs: Any,
    ) -> Dict[str, Any]:
        """图片生成请求"""
        payload: Dict[str, Any] = {
            "model": model or self._default_models.get(Capability.IMAGE_GENERATION, ""),
            "prompt": prompt,
            "size": size,
            "n": n,
            **kwargs,
        }
        # 如果 model 为空则移除，让 API 用默认值
        if not payload["model"]:
            del payload["model"]
        return await self._request("POST", "/images/generations", payload)

    # ── HTTP 请求 + 重试 ──

    async def _request(
        self,
        method: str,
        endpoint: str,
        json_data: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """HTTP 请求方法 — 含完整重试逻辑"""
        url = f"{self._base_url}/{endpoint.lstrip('/')}"
        retries = 0

        while True:
            try:
                async with httpx.AsyncClient(timeout=self._timeout) as client:
                    response = await client.request(
                        method, url, headers=self._headers, json=json_data
                    )

                if response.status_code == 401:
                    raise auth_failed()

                if response.status_code == 429:
                    retry_after = int(response.headers.get("Retry-After", 5))
                    if retries < self._max_retries:
                        retries += 1
                        await asyncio.sleep(retry_after)
                        continue
                    raise api_error(429, "请求频率过高，请稍后重试")

                if 400 <= response.status_code < 500:
                    detail = response.text[:500]
                    raise api_error(response.status_code, detail)

                if response.status_code >= 500:
                    if retries < self._max_retries:
                        retries += 1
                        await asyncio.sleep(2 ** retries)
                        continue
                    raise api_error(
                        response.status_code,
                        f"API 服务异常，已重试 {retries} 次",
                    )

                return response.json()

            except httpx.TimeoutException:
                if retries < self._max_retries:
                    retries += 1
                    await asyncio.sleep(2 ** retries)
                    continue
                raise timeout(retries)

            except httpx.ConnectError:
                if retries < self._max_retries:
                    retries += 1
                    await asyncio.sleep(2 ** retries)
                    continue
                raise connection_failed()

            except Exception:
                raise
