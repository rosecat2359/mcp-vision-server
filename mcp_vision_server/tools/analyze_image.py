"""图片分析工具 — analyze_image + extract_text"""
from typing import Any, Dict, Optional
from ..utils.media import resolve_media_input
from ..providers.adapters.openai_compat import OpenAICompatibleProvider


def _build_vision_message(
    image_input: str, text_prompt: str
) -> Dict[str, Any]:
    """构建 OpenAI vision 格式的 message"""
    media = resolve_media_input(image_input)
    image_block = {"type": "image_url", "image_url": {"url": media["value"]}}

    return {
        "role": "user",
        "content": [
            image_block,
            {"type": "text", "text": text_prompt},
        ],
    }


async def handle_analyze_image(
    client: OpenAICompatibleProvider,
    image_url: str,
    prompt: Optional[str] = None,
    model: Optional[str] = None,
) -> str:
    """分析/描述图片内容"""
    text_prompt = prompt if prompt else "请详细描述这张图片的内容。"

    message = _build_vision_message(image_url, text_prompt)
    result = await client.chat_completion(
        messages=[message], model=model
    )
    return result["choices"][0]["message"]["content"]


async def handle_extract_text(
    client: OpenAICompatibleProvider,
    image_url: str,
    language: Optional[str] = None,
    model: Optional[str] = None,
) -> str:
    """从图片中提取文字（OCR）"""
    lang_hint = f"（语言: {language}）" if language else ""
    text_prompt = (
        f"请提取这张图片中的所有文字内容{lang_hint}。"
        "只返回提取的文字，不要添加额外说明。"
    )

    message = _build_vision_message(image_url, text_prompt)
    result = await client.chat_completion(
        messages=[message], model=model
    )
    return result["choices"][0]["message"]["content"]
