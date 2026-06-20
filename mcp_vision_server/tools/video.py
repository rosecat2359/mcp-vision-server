"""视频处理工具 — analyze_video + generate_video"""
import base64
import re
from typing import Any, Dict, List, Optional

import httpx

from ..providers.adapters.openai_compat import OpenAICompatibleProvider
from ..utils.media import download_to_base64, resolve_media_input


async def handle_analyze_video(
    client: OpenAICompatibleProvider,
    video_url: str,
    prompt: Optional[str] = None,
    fps: Optional[int] = None,
    model: Optional[str] = None,
) -> str:
    """分析视频内容，返回文字描述/摘要"""
    media = resolve_media_input(video_url)

    text_prompt = prompt if prompt else "请详细描述这个视频的内容，包括场景、动作和关键帧。"
    if fps:
        text_prompt += f"（采样帧率: {fps} fps）"

    if media["type"] == "data_uri":
        # 本地文件 → base64 data URI 内联传递给视频模型
        video_block = {"type": "video_url", "video_url": {"url": media["value"]}}
    else:
        # HTTP URL 透传给下游 API
        video_block = {"type": "video_url", "video_url": {"url": media["value"]}}

    content: List[Dict[str, Any]] = [
        video_block,
        {"type": "text", "text": text_prompt},
    ]

    result = await client.chat_completion(
        messages=[{"role": "user", "content": content}],
        model=model,
    )
    return result["choices"][0]["message"]["content"]


async def handle_generate_video(
    client: OpenAICompatibleProvider,
    prompt: str,
    duration: str = "5s",
    resolution: str = "1080p",
    model: Optional[str] = None,
) -> List[str]:
    """文生视频 — 返回生成的视频 base64 data URI 列表"""
    gen_prompt = (
        f"请根据以下描述生成视频:\n{prompt}\n"
        f"时长: {duration}\n"
        f"分辨率: {resolution}"
    )

    messages: List[Dict[str, Any]] = [
        {"role": "user", "content": gen_prompt}
    ]

    result = await client.chat_completion(
        messages=messages, model=model,
    )

    # 解析响应中的视频 URL
    response_text = result["choices"][0]["message"]["content"]
    videos: List[str] = []

    # 尝试从响应中提取 URL
    urls = re.findall(r'https?://[^\s<>"]+\.(?:mp4|mov|webm|avi)[^\s<>"]*', response_text)

    if urls:
        async with httpx.AsyncClient(timeout=300) as http_client:
            for url in urls:
                data_uri = await download_to_base64(url, http_client)
                videos.append(data_uri)
    else:
        # API 未返回视频 URL，将响应文本以 text/plain data URI 形式返回
        encoded_text = base64.b64encode(response_text.encode("utf-8")).decode("ascii")
        videos.append(f"data:text/plain;base64,{encoded_text}")

    return videos
