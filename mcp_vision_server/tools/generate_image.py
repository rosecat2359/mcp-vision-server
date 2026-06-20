"""图片生成工具 — generate_image + edit_image"""
from typing import Any, Dict, List, Optional
import httpx
from ..utils.media import resolve_media_input, download_to_base64
from ..providers.adapters.openai_compat import OpenAICompatibleProvider


async def handle_generate_image(
    client: OpenAICompatibleProvider,
    prompt: str,
    size: str = "1024x1024",
    style: Optional[str] = None,
    n: int = 1,
    model: Optional[str] = None,
) -> List[str]:
    """文生图 — 返回 base64 data URI 列表"""
    extra: Dict[str, Any] = {}
    if style:
        extra["style"] = style

    result = await client.image_generation(
        prompt=prompt, size=size, n=n, model=model, **extra
    )

    # 下载生成的图片并转为 base64
    async with httpx.AsyncClient(timeout=120) as http_client:
        images = []
        for item in result.get("data", []):
            url = item.get("url") or item.get("b64_json")
            if url and (url.startswith("http://") or url.startswith("https://")):
                data_uri = await download_to_base64(url, http_client)
                images.append(data_uri)
            elif url:
                # API 直接返回 base64
                images.append(url)
        return images


async def handle_edit_image(
    client: OpenAICompatibleProvider,
    image_url: str,
    prompt: str,
    mask_url: Optional[str] = None,
    model: Optional[str] = None,
) -> str:
    """编辑/修复图片，返回编辑后图片的 base64 data URI"""
    media = resolve_media_input(image_url)
    image_block = {"type": "image_url", "image_url": {"url": media["value"]}}

    content: List[Dict[str, Any]] = [image_block]

    if mask_url:
        mask_media = resolve_media_input(mask_url)
        mask_block = {"type": "image_url", "image_url": {"url": mask_media["value"]}}
        content.append(mask_block)

    content.append({
        "type": "text",
        "text": f"请根据以下描述编辑这张图片: {prompt}。返回编辑后的图片。",
    })

    result = await client.chat_completion(
        messages=[{"role": "user", "content": content}],
        model=model,
    )

    return result["choices"][0]["message"]["content"]
