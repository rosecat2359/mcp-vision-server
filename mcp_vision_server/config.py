"""配置管理 — 从环境变量读取，提供合理的默认值

支持多 Provider:
- 仅设 AGNES_API_KEY → 向后兼容，行为不变
- 设 VISION_PROVIDER=openai + OPENAI_API_KEY → 所有工具走 OpenAI
- 按任务分别设置 Provider → VISION_PROVIDER, IMAGE_PROVIDER, VIDEO_PROVIDER
- 自定义端点 → CUSTOM_BASE_URL + CUSTOM_API_KEY
"""
import os


def _float_env(key: str, default: float) -> float:
    """读取浮点型环境变量，失败返回默认值"""
    val = os.environ.get(key)
    if val is None:
        return default
    try:
        return float(val)
    except ValueError:
        return default


def _int_env(key: str, default: int) -> int:
    """读取整型环境变量，失败返回默认值"""
    val = os.environ.get(key)
    if val is None:
        return default
    try:
        return int(val)
    except ValueError:
        return default


# ── 保留原有 AGNES_* 变量（向后兼容） ──────────────────────────

AGNES_API_KEY = os.environ.get("AGNES_API_KEY", "")
AGNES_BASE_URL = os.environ.get("AGNES_BASE_URL", "https://apihub.agnes-ai.com/v1")
AGNES_DEFAULT_MODEL = os.environ.get("AGNES_DEFAULT_MODEL", "agnes-2.0-flash")
AGNES_TIMEOUT = _float_env("AGNES_TIMEOUT", 120.0)
AGNES_MAX_RETRIES = _int_env("AGNES_MAX_RETRIES", 3)

# ── Provider 选择 ──────────────────────────────────────────────

# 默认 Provider（所有未单独指定 Provider 的任务都使用此值）
VISION_PROVIDER = os.environ.get("VISION_PROVIDER", "")

# 按任务指定 Provider（优先级高于 VISION_PROVIDER）
IMAGE_PROVIDER = os.environ.get("IMAGE_PROVIDER", "")
VIDEO_PROVIDER = os.environ.get("VIDEO_PROVIDER", "")

# Fallback Provider 链（逗号分隔，前面的优先级更高）
PROVIDER_FALLBACK = os.environ.get("PROVIDER_FALLBACK", "")

# ── 按任务指定默认模型 ─────────────────────────────────────────

# 每个能力的默认模型覆盖（不设则使用 Provider 内置默认值）
VISION_MODEL = os.environ.get("VISION_MODEL", "")          # 用于 analyze/extract
IMAGE_GEN_MODEL = os.environ.get("IMAGE_GEN_MODEL", "")    # 用于 generate_image
IMAGE_EDIT_MODEL = os.environ.get("IMAGE_EDIT_MODEL", "")  # 用于 edit_image
VIDEO_ANALYSIS_MODEL = os.environ.get("VIDEO_ANALYSIS_MODEL", "")  # 用于 analyze_video
VIDEO_GEN_MODEL = os.environ.get("VIDEO_GEN_MODEL", "")    # 用于 generate_video

# ── 已知 Provider 的 API Key 和端点 ────────────────────────────

# OpenAI
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
OPENAI_BASE_URL = os.environ.get("OPENAI_BASE_URL", "")

# OpenRouter
OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "")
OPENROUTER_BASE_URL = os.environ.get("OPENROUTER_BASE_URL", "")

# Groq
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
GROQ_BASE_URL = os.environ.get("GROQ_BASE_URL", "")

# ── 自定义端点（自部署模型） ─────────────────────────────────────

CUSTOM_BASE_URL = os.environ.get("CUSTOM_BASE_URL", "")
CUSTOM_API_KEY = os.environ.get("CUSTOM_API_KEY", "")
CUSTOM_PROVIDER_NAME = os.environ.get("CUSTOM_PROVIDER_NAME", "custom")

# ── 高级配置（预留） ────────────────────────────────────────────

# JSON 格式的多 Provider 高级配置字符串，本期不解析
# 格式: '[{"name":"openai","base_url":"...","api_key":"..."}, ...]'
VISION_PROVIDERS_CONFIG = os.environ.get("VISION_PROVIDERS_CONFIG", "")
