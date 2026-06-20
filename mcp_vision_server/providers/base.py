"""Provider 抽象基类 — 所有 API 提供商的统一接口"""
from abc import ABC, abstractmethod
from enum import Enum
from typing import Any, Dict, List, Optional


class Capability(str, Enum):
    """Provider 能力类型"""
    VISION = "vision"                      # 图片分析/OCR
    IMAGE_GENERATION = "image_generation"  # 文生图
    IMAGE_EDIT = "image_edit"              # 图片编辑
    VIDEO_ANALYSIS = "video_analysis"      # 视频分析
    VIDEO_GENERATION = "video_generation"  # 文生视频


class BaseProvider(ABC):
    """所有 API Provider 必须实现的接口"""

    # ── 标识 ──

    @property
    @abstractmethod
    def name(self) -> str:
        """Provider 名称，如 'openai'、'agnes'"""
        ...

    @property
    @abstractmethod
    def capabilities(self) -> set[Capability]:
        """该 Provider 支持的能力集合"""
        ...

    @property
    def base_url(self) -> str:
        """API 端点 URL"""
        return ""

    # ── 核心 API ──

    @abstractmethod
    async def chat_completion(
        self,
        messages: List[Dict[str, Any]],
        model: Optional[str] = None,
        **kwargs: Any,
    ) -> Dict[str, Any]:
        """OpenAI 兼容的 chat/completions 请求，返回完整 JSON 响应"""
        ...

    @abstractmethod
    async def image_generation(
        self,
        prompt: str,
        size: str = "1024x1024",
        n: int = 1,
        model: Optional[str] = None,
        **kwargs: Any,
    ) -> Dict[str, Any]:
        """图片生成请求，返回完整 JSON 响应"""
        ...

    # ── 模型选择 ──

    def default_model_for(self, capability: Capability) -> Optional[str]:
        """返回该 Provider 对指定能力的默认模型名，无则返回 None"""
        return None

    # ── 健康检查 ──

    async def health_check(self) -> bool:
        """快速检查 Provider 是否可用（默认返回 True）"""
        return True

    def __repr__(self) -> str:
        caps = ", ".join(c.value for c in self.capabilities)
        return f"<{self.name}: {caps}>"
