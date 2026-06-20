"""MCP Vision Server 主入口 — 注册工具、启动 stdio 服务

支持多 Provider 自动路由:
- 工具调用时自动按能力选择最合适的 Provider
- 用户可通过环境变量按任务指定 Provider 和模型
"""
import logging
from typing import Any, Dict, List, Optional
import mcp.server.stdio
from mcp.server import Server
from mcp.server.models import InitializationOptions
from mcp.types import (
    Tool,
    TextContent,
    ImageContent,
    ServerCapabilities,
    ToolsCapability,
)

from .config import (
    AGNES_API_KEY,
    VISION_MODEL, IMAGE_GEN_MODEL, IMAGE_EDIT_MODEL,
    VIDEO_ANALYSIS_MODEL, VIDEO_GEN_MODEL,
)
from .tools.analyze_image import handle_analyze_image, handle_extract_text
from .tools.generate_image import handle_generate_image, handle_edit_image
from .tools.video import handle_analyze_video, handle_generate_video
from .utils.errors import VisionError
from .providers.base import Capability
from .providers.registry import ProviderRegistry, get_registry, TOOL_CAPABILITY
from .providers.adapters.openai_compat import OpenAICompatibleProvider

logger = logging.getLogger("mcp-vision-server")

# ── MCP Server 实例 ──────────────────────────────────────────
server = Server("vision-server")

# ── 全局 Registry 实例 ───────────────────────────────────────
_registry: Optional[ProviderRegistry] = None


def get_client_registry() -> ProviderRegistry:
    """获取共享的 ProviderRegistry（惰性初始化）"""
    global _registry
    if _registry is None:
        _registry = get_registry()
    return _registry


# ── 模型覆盖映射（环境变量 → 工具参数） ──────────────────────

# 工具名 → 任务模型环境变量中的模型覆盖
_TOOL_MODEL_OVERRIDE: Dict[str, str] = {
    "analyze_image": VISION_MODEL,
    "extract_text": VISION_MODEL,
    "generate_image": IMAGE_GEN_MODEL,
    "edit_image": IMAGE_EDIT_MODEL,
    "analyze_video": VIDEO_ANALYSIS_MODEL,
    "generate_video": VIDEO_GEN_MODEL,
}


def _resolve_model(
    tool_name: str,
    capability: Capability,
    registry: ProviderRegistry,
    arguments: Dict[str, Any],
) -> Optional[str]:
    """解析工具调用所需的模型名称

    优先级:
    1. 工具参数中用户显式指定的 model
    2. 环境变量中的模型覆盖 (VISION_MODEL, IMAGE_GEN_MODEL, ...)
    3. Provider 内置默认模型
    """
    # 优先使用工具参数中的 model
    if arguments.get("model"):
        return arguments["model"]

    # 其次使用环境变量覆盖
    env_model = _TOOL_MODEL_OVERRIDE.get(tool_name, "")
    if env_model:
        return env_model

    # 最后使用 Provider 默认模型
    return registry.get_default_model(capability)


# ── 工具定义 ─────────────────────────────────────────────────

def _get_all_tools() -> List[Tool]:
    """返回所有工具定义（含动态新增的 list_providers）"""
    return [
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
                        "description": "可选，指定使用的视觉模型名称。不指定则根据当前配置的 Provider 自动选择",
                    },
                    "provider": {
                        "type": "string",
                        "description": "可选，指定使用的 AI 提供商，如 'openai'、'agnes'。不指定则自动选择",
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
        Tool(
            name="list_providers",
            description="列出当前配置的所有 AI Provider 及其支持的模型和能力。用于查看可用服务和自动路由情况。",
            inputSchema={
                "type": "object",
                "properties": {},
                "required": [],
            },
        ),
    ]


TOOLS = _get_all_tools()


# ── MCP 协议处理 ─────────────────────────────────────────────

@server.list_tools()
async def handle_list_tools() -> List[Tool]:
    """返回所有可用工具的定义"""
    return TOOLS


@server.call_tool()
async def handle_call_tool(
    name: str, arguments: Dict[str, Any]
) -> List[TextContent | ImageContent]:
    """处理工具调用，自动路由到合适的 Provider"""
    try:
        registry = get_client_registry()

        if name == "list_providers":
            return await _handle_list_providers(registry)

        # ── 根据工具类型获取 Provider ──
        capability = TOOL_CAPABILITY.get(name)
        if capability is None:
            return [TextContent(
                type="text",
                text=f"未知工具: {name}。可用工具: analyze_image, extract_text, generate_image, edit_image, analyze_video, generate_video, list_providers",
            )]

        provider = registry.get_for_capability(
            capability,
            preferred=arguments.get("provider"),
        )

        # ── 解析模型 ──
        resolved_model = _resolve_model(name, capability, registry, arguments)

        # ── 路由到处理函数 ──

        if name == "analyze_image":
            result_text = await handle_analyze_image(
                provider,
                image_url=arguments["image_url"],
                prompt=arguments.get("prompt"),
                model=resolved_model,
            )
            return [TextContent(type="text", text=result_text)]

        elif name == "extract_text":
            result_text = await handle_extract_text(
                provider,
                image_url=arguments["image_url"],
                language=arguments.get("language"),
                model=resolved_model,
            )
            return [TextContent(type="text", text=result_text)]

        elif name == "generate_image":
            images = await handle_generate_image(
                provider,
                prompt=arguments["prompt"],
                size=arguments.get("size", "1024x1024"),
                style=arguments.get("style"),
                n=arguments.get("n", 1),
                model=resolved_model,
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
                provider,
                image_url=arguments["image_url"],
                prompt=arguments["prompt"],
                mask_url=arguments.get("mask_url"),
                model=resolved_model,
            )
            return [TextContent(type="text", text=result_text)]

        elif name == "analyze_video":
            result_text = await handle_analyze_video(
                provider,
                video_url=arguments["video_url"],
                prompt=arguments.get("prompt"),
                fps=arguments.get("fps"),
                model=resolved_model,
            )
            return [TextContent(type="text", text=result_text)]

        elif name == "generate_video":
            videos = await handle_generate_video(
                provider,
                prompt=arguments["prompt"],
                duration=arguments.get("duration", "5s"),
                resolution=arguments.get("resolution", "1080p"),
                model=resolved_model,
            )
            return [TextContent(type="text", text="\n".join(videos))]

        else:
            return [TextContent(
                type="text",
                text=f"未知工具: {name}",
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


async def _handle_list_providers(
    registry: ProviderRegistry,
) -> List[TextContent]:
    """处理 list_providers 工具调用"""
    providers = registry.list_providers()

    if not providers:
        return [TextContent(
            type="text",
            text="⚠ 没有配置任何 API Provider。请设置对应的 API Key 环境变量。\n\n"
                 "例如:\n"
                 "  - AGNES_API_KEY=sk-xxx\n"
                 "  - OPENAI_API_KEY=sk-xxx\n"
                 "  - VISION_PROVIDER=openai + OPENAI_API_KEY=sk-xxx\n"
                 "  - CUSTOM_BASE_URL=http://localhost:8080/v1 + CUSTOM_API_KEY=sk-xxx",
        )]

    lines = ["## 已配置的 AI Provider\n"]
    for p in providers:
        lines.append(f"### {p['name']}")
        lines.append(f"- 端点: {p['base_url']}")
        lines.append(f"- 能力: {', '.join(p['capabilities'])}")
        if p.get("models"):
            lines.append("- 默认模型:")
            for cap_name, model in p["models"].items():
                lines.append(f"  - {cap_name}: `{model}`")
        lines.append("")

    # 附加路由说明
    lines.append("## 工具 → Provider 路由\n")
    for tool_name, cap in TOOL_CAPABILITY.items():
        try:
            provider = registry.get_for_capability(cap)
            model = provider.default_model_for(cap) or "自动"
            lines.append(f"- `{tool_name}` → **{provider.name}** (模型: `{model}`)")
        except VisionError:
            lines.append(f"- `{tool_name}` → ⚠ 无可用 Provider")

    return [TextContent(type="text", text="\n".join(lines))]


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
                server_version="0.2.0",
                capabilities=ServerCapabilities(
                    tools=ToolsCapability(listChanged=True),
                ),
            ),
            raise_exceptions=False,
        )
