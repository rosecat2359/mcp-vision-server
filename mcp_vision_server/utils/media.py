"""媒体预处理 — URL 判断、本地文件读取、base64 编码"""
import base64
import os
from urllib.parse import urlparse
from typing import Dict
import httpx
from .errors import file_not_found, unsupported_format

# 支持的扩展名 → MIME type
_IMAGE_MIME = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".bmp": "image/bmp",
    ".tiff": "image/tiff",
}
_VIDEO_MIME = {
    ".mp4": "video/mp4",
    ".mov": "video/quicktime",
    ".avi": "video/x-msvideo",
    ".webm": "video/webm",
    ".mkv": "video/x-matroska",
}
_ALL_MIME = {**_IMAGE_MIME, **_VIDEO_MIME}
_SUPPORTED_EXTENSIONS = set(_ALL_MIME.keys())


def is_url(path: str) -> bool:
    """判断输入是否为 HTTP(S) URL"""
    parsed = urlparse(path)
    return parsed.scheme in ("http", "https")


def is_local_file(path: str) -> bool:
    """判断输入是否为本地文件路径"""
    return not is_url(path) and os.path.isfile(path)


def _get_extension(path: str) -> str:
    return os.path.splitext(path)[1].lower()


def local_to_data_uri(file_path: str) -> str:
    """读取本地文件并返回 data URI 字符串"""
    if not os.path.isfile(file_path):
        raise file_not_found(file_path)

    ext = _get_extension(file_path)
    mime = _ALL_MIME.get(ext)
    if mime is None:
        raise unsupported_format(ext, ", ".join(sorted(_SUPPORTED_EXTENSIONS)))

    with open(file_path, "rb") as f:
        encoded = base64.b64encode(f.read()).decode("ascii")
    return f"data:{mime};base64,{encoded}"


def resolve_media_input(input_path: str) -> Dict[str, str]:
    """
    统一处理媒体输入，返回:
      {"type": "url", "value": "<url>"}       — HTTP URL 直接透传
      {"type": "data_uri", "value": "<uri>"}  — 本地文件转 data URI

    Raises:
        VisionError: 文件不存在或格式不支持
    """
    if is_url(input_path):
        return {"type": "url", "value": input_path}

    data_uri = local_to_data_uri(input_path)
    return {"type": "data_uri", "value": data_uri}


async def download_to_base64(url: str, client: httpx.AsyncClient) -> str:
    """下载 URL 内容并以 base64 data URI 格式返回"""
    response = await client.get(url)
    response.raise_for_status()
    content_type = response.headers.get("content-type", "application/octet-stream")
    encoded = base64.b64encode(response.content).decode("ascii")
    return f"data:{content_type};base64,{encoded}"
