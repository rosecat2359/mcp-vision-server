"""MCP Vision Server 主入口 — 注册工具、启动 stdio 服务"""
import logging
from typing import Any, Dict, List, Optional
import mcp.server.stdio
from mcp.server import Server, NotificationOptions
from mcp.server.models import InitializationOptions
from mcp.types import (
    Tool,
    TextContent,
    ImageContent,
    ServerCapabilities,
    ToolsCapability,
)

from .config import AGNES_API_KEY
from .client import AgnesClient
from .tools.analyze_image import handle_analyze_image, handle_extract_text
from .tools.generate_image import handle_generate_image, handle_edit_image
from .tools.video import handle_analyze_video, handle_generate_video
from .utils.errors import VisionError

logger = logging.getLogger("mcp-vision-server")

# ── MCP Server 实例 ──────────────────────────────────────────
server = Server("vision-server")

# ── 全局客户端实例 ───────────────────────────────────────────
_client: Optional[AgnesClient] = None


def get_client() -> AgnesClient:
    global _client
    if _client is None:
        _client = AgnesClient()
    return _client


# ── 工具定义 ─────────────────────────────────────────────────

TOOLS = [
    Tool(
        name="analyze_image",
        description="分析图片内容。传入图片 URL 或本地路径，返回图片的描述、分析和分类结果。",
        inputSchema={
            "type": "object",
            "properties": {
                "image_url": {
                    "type": "string",
                    "description": "图片 URL（http/https）或本地文件的绝对路径",
                },
                "prompt": {
                    "type": "string",
                    "description": "可选的提示词，用于指定分析方向。不提供则默认详细描述图片",
                },
                "model": {
                    "type": "string",
                    "description": "可选，指定使用的视觉模型名称",
                },
            },
            "required": ["image_url"],
        },
    ),
    Tool(
        name="extract_text",
        description="从图片中提取文字（OCR）。传入图片 URL 或本地路径，返回图片中的所有文字内容。",
        inputSchema={
            "type": "object",
            "properties": {
                "image_url": {
                    "type": "string",
                    "description": "图片 URL（http/https）或本地文件的绝对路径",
                },
                "language": {
                    "type": "string",
                    "description": "可选，指定文字语言以提升识别准确度，如 '中文'、'English'",
                },
            },
            "required": ["image_url"],
        },
    ),
    Tool(
        name="generate_image",
        description="根据文字描述生成图片。返回生成的图片（base64 格式）。",
        inputSchema={
            "type": "object",
            "properties": {
                "prompt": {
                    "type": "string",
                    "description": "图片的文字描述，越详细越好",
                },
                "size": {
                    "type": "string",
                    "description": "图片尺寸，如 '1024x1024'、'512x512'、'1792x1024'。默认 1024x1024",
                },
                "style": {
                    "type": "string",
                    "description": "可选，图片风格，如 'natural'、'vivid'",
                },
                "n": {
                    "type": "integer",
                    "description": "生成数量，默认 1",
                },
            },
            "required": ["prompt"],
        },
    ),
    Tool(
        name="edit_image",
        description="编辑或修复图片。传入原图 URL/路径和编辑描述，返回编辑后的图片。",
        inputSchema={
            "type": "object",
            "properties": {
                "image_url": {
                    "type": "string",
                    "description": "原图 URL（http/https）或本地文件的绝对路径",
                },
                "prompt": {
                    "type": "string",
                    "description": "编辑描述，说明要对图片做什么修改",
                },
                "mask_url": {
                    "type": "string",
                    "description": "可选，蒙版图片的 URL 或本地路径，标记需要编辑的区域",
                },
            },
            "required": ["image_url", "prompt"],
        },
    ),
    Tool(
        name="analyze_video",
        description="分析视频内容。传入视频 URL 或本地路径，返回视频的描述、场景分析和摘要。",
        inputSchema={
            "type": "object",
            "properties": {
                "video_url": {
                    "type": "string",
                    "description": "视频 URL（http/https）或本地文件的绝对路径",
                },
                "prompt": {
                    "type": "string",
                    "description": "可选的提示词，用于指定分析方向",
                },
                "fps": {
                    "type": "integer",
                    "description": "可选，视频采样帧率",
                },
            },
            "required": ["video_url"],
        },
    ),
    Tool(
        name="generate_video",
        description="根据文字描述生成视频。",
        inputSchema={
            "type": "object",
            "properties": {
                "prompt": {
                    "type": "string",
                    "description": "视频的文字描述",
                },
                "duration": {
                    "type": "string",
                    "description": "视频时长，如 '5s'、'10s'。默认 5s",
                },
                "resolution": {
                    "type": "string",
                    "description": "视频分辨率，如 '1080p'、'720p'。默认 1080p",
                },
            },
            "required": ["prompt"],
        },
    ),
]


# ── MCP 协议处理 ─────────────────────────────────────────────

@server.list_tools()
async def handle_list_tools() -> List[Tool]:
    """返回所有可用工具的定义"""
    return TOOLS


@server.call_tool()
async def handle_call_tool(
    name: str, arguments: Dict[str, Any]
) -> List[TextContent | ImageContent]:
    """处理工具调用，路由到对应的处理函数"""
    try:
        client = get_client()

        if name == "analyze_image":
            result_text = await handle_analyze_image(
                client,
                image_url=arguments["image_url"],
                prompt=arguments.get("prompt"),
                model=arguments.get("model"),
            )
            return [TextContent(type="text", text=result_text)]

        elif name == "extract_text":
            result_text = await handle_extract_text(
                client,
                image_url=arguments["image_url"],
                language=arguments.get("language"),
            )
            return [TextContent(type="text", text=result_text)]

        elif name == "generate_image":
            images = await handle_generate_image(
                client,
                prompt=arguments["prompt"],
                size=arguments.get("size", "1024x1024"),
                style=arguments.get("style"),
                n=arguments.get("n", 1),
            )
            result: List[TextContent | ImageContent] = []
            for i, img_data in enumerate(images):
                result.append(TextContent(
                    type="text", text=f"生成的图片 {i + 1}:"
                ))
                result.append(ImageContent(
                    type="image", data=img_data, mimeType="image/png"
                ))
            return result

        elif name == "edit_image":
            result_text = await handle_edit_image(
                client,
                image_url=arguments["image_url"],
                prompt=arguments["prompt"],
                mask_url=arguments.get("mask_url"),
            )
            return [TextContent(type="text", text=result_text)]

        elif name == "analyze_video":
            result_text = await handle_analyze_video(
                client,
                video_url=arguments["video_url"],
                prompt=arguments.get("prompt"),
                fps=arguments.get("fps"),
            )
            return [TextContent(type="text", text=result_text)]

        elif name == "generate_video":
            videos = await handle_generate_video(
                client,
                prompt=arguments["prompt"],
                duration=arguments.get("duration", "5s"),
                resolution=arguments.get("resolution", "1080p"),
            )
            return [TextContent(type="text", text="\n".join(videos))]

        else:
            return [TextContent(
                type="text",
                text=f"未知工具: {name}。可用工具: analyze_image, extract_text, generate_image, edit_image, analyze_video, generate_video",
            )]

    except VisionError as e:
        logger.error("VisionError: %s", e.message)
        return [TextContent(
            type="text", text=f"❌ {e.message}"
        )]
    except Exception as e:
        logger.exception("未预期的错误")
        return [TextContent(
            type="text", text=f"❌ 服务内部错误: {str(e)}"
        )]


# ── 入口 ─────────────────────────────────────────────────────

async def main() -> None:
    """启动 MCP Vision Server (stdio 模式)"""
    if not AGNES_API_KEY:
        logger.warning(
            "⚠ AGNES_API_KEY 未设置！请通过环境变量或 .claude/settings.json 配置。"
        )

    async with mcp.server.stdio.stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            initialization_options=InitializationOptions(
                server_name="vision-server",
                server_version="0.1.0",
                capabilities=ServerCapabilities(
                    tools=ToolsCapability(listChanged=True),
                ),
            ),
            raise_exceptions=False,
        )
