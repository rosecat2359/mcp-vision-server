"""Provider Catalog — 内置已知 API 提供商的默认配置"""
from typing import Any, Dict, List
from .base import Capability

# ── 能力代号的简写形式 ──
_V = "VISION"
_IG = "IMAGE_GENERATION"
_IE = "IMAGE_EDIT"
_VA = "VIDEO_ANALYSIS"
_VG = "VIDEO_GENERATION"

# ── Catalog 条目结构 ──
#   base_url:       API 端点地址
#   api_key_env:    存放 API Key 的环境变量名
#   base_url_env:   存放自定义 base_url 的环境变量名（可选）
#   capabilities:   该 Provider 支持的能力列表
#   default_models: 每种能力的默认模型

CatalogEntry = Dict[str, Any]

PROVIDER_CATALOG: Dict[str, CatalogEntry] = {
    "agnes": {
        "base_url": "https://apihub.agnes-ai.com/v1",
        "api_key_env": "AGNES_API_KEY",
        "base_url_env": "AGNES_BASE_URL",
        "timeout_env": "AGNES_TIMEOUT",
        "retries_env": "AGNES_MAX_RETRIES",
        "capabilities": [_V, _IG, _IE, _VA, _VG],
        "default_models": {
            _V: "agnes-2.0-flash",
            _IG: "agnes-image-2.1-flash",
            _IE: "agnes-2.0-flash",
            _VA: "agnes-video-v2.0",
            _VG: "agnes-video-v2.0",
        },
    },
    "openai": {
        "base_url": "https://api.openai.com/v1",
        "api_key_env": "OPENAI_API_KEY",
        "base_url_env": "OPENAI_BASE_URL",
        "capabilities": [_V, _IG, _IE],
        "default_models": {
            _V: "gpt-4o",
            _IG: "dall-e-3",
            _IE: "gpt-4o",
        },
    },
    "openrouter": {
        "base_url": "https://openrouter.ai/api/v1",
        "api_key_env": "OPENROUTER_API_KEY",
        "base_url_env": "OPENROUTER_BASE_URL",
        "capabilities": [_V, _IE],
        "default_models": {
            _V: "openai/gpt-4o",
            _IE: "openai/gpt-4o",
        },
    },
    "groq": {
        "base_url": "https://api.groq.com/openai/v1",
        "api_key_env": "GROQ_API_KEY",
        "base_url_env": "GROQ_BASE_URL",
        "capabilities": [_V],
        "default_models": {
            _V: "llama-3.2-90b-vision-preview",
        },
    },
}


def resolve_capabilities(raw: List[str]) -> set[Capability]:
    """将字符串列表转换为 Capability 集合"""
    return {Capability[c] for c in raw}
