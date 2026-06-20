"""Agnes AI API 客户端 — 向后兼容

推荐: 新代码使用 providers 模块获得多 Provider 支持:
    from .providers import get_registry

本文件保留以保持向后兼容，原有使用方式不受影响。
"""
import asyncio
from typing import Any, Dict, List, Optional

import httpx

from .config import (
    AGNES_API_KEY,
    AGNES_BASE_URL,
    AGNES_DEFAULT_MODEL,
    AGNES_MAX_RETRIES,
    AGNES_TIMEOUT,
)
from .utils.errors import api_error, auth_failed, connection_failed, timeout


class AgnesClient:
    """Agnes AI API 异步客户端

    注意: 该类仍然可用且保持不变。新代码建议使用:
        from mcp_vision_server.providers import get_registry

    ProviderRegistry 支持 OpenAI、OpenRouter、Groq、自定义端点等多 Provider。
    """

    def __init__(self) -> None:
        self.base_url = AGNES_BASE_URL.rstrip("/")
        self.headers = {
            "Authorization": f"Bearer {AGNES_API_KEY}",
            "Content-Type": "application/json",
        }
        self.timeout = AGNES_TIMEOUT
        self.max_retries = AGNES_MAX_RETRIES

    async def _request(
        self,
        method: str,
        endpoint: str,
        json_data: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        retries = 0

        while True:
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    response = await client.request(
                        method, url, headers=self.headers, json=json_data
                    )

                if response.status_code == 401:
                    raise auth_failed()

                if response.status_code == 429:
                    retry_after = int(response.headers.get("Retry-After", 5))
                    if retries < self.max_retries:
                        retries += 1
                        await asyncio.sleep(retry_after)
                        continue
                    raise api_error(429, "请求频率过高，请稍后重试")

                if 400 <= response.status_code < 500:
                    detail = response.text[:500]
                    raise api_error(response.status_code, detail)

                if response.status_code >= 500:
                    if retries < self.max_retries:
                        retries += 1
                        await asyncio.sleep(2 ** retries)
                        continue
                    raise api_error(
                        response.status_code,
                        f"API 服务异常，已重试 {retries} 次",
                    )

                return response.json()

            except httpx.TimeoutException:
                if retries < self.max_retries:
                    retries += 1
                    await asyncio.sleep(2 ** retries)
                    continue
                raise timeout(retries)

            except httpx.ConnectError:
                if retries < self.max_retries:
                    retries += 1
                    await asyncio.sleep(2 ** retries)
                    continue
                raise connection_failed()

            except Exception:
                raise

    async def chat_completion(
        self,
        messages: List[Dict[str, Any]],
        model: Optional[str] = None,
        **kwargs: Any,
    ) -> Dict[str, Any]:
        """OpenAI 兼容的 chat/completions 请求"""
        payload: Dict[str, Any] = {
            "model": model or AGNES_DEFAULT_MODEL,
            "messages": messages,
            **kwargs,
        }
        return await self._request("POST", "/chat/completions", payload)

    async def image_generation(
        self,
        prompt: str,
        size: str = "1024x1024",
        n: int = 1,
        **kwargs: Any,
    ) -> Dict[str, Any]:
        """图片生成请求"""
        payload: Dict[str, Any] = {
            "prompt": prompt,
            "size": size,
            "n": n,
            **kwargs,
        }
        return await self._request("POST", "/images/generations", payload)
