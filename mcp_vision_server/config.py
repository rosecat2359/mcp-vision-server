"""配置管理 — 从环境变量读取，提供合理的默认值"""
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


AGNES_API_KEY = os.environ.get("AGNES_API_KEY", "")
AGNES_BASE_URL = os.environ.get("AGNES_BASE_URL", "https://apihub.agnes-ai.com/v1")
AGNES_DEFAULT_MODEL = os.environ.get("AGNES_DEFAULT_MODEL", "default")
AGNES_TIMEOUT = _float_env("AGNES_TIMEOUT", 120.0)
AGNES_MAX_RETRIES = _int_env("AGNES_MAX_RETRIES", 3)
