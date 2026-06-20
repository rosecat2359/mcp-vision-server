"""统一错误类型 — 所有异常使用中文消息"""
from typing import Optional


class VisionError(Exception):
    """视觉服务基础异常"""

    def __init__(self, message: str, error_type: str = "internal") -> None:
        self.message = message
        self.error_type = error_type
        super().__init__(message)


def file_not_found(path: str) -> VisionError:
    return VisionError(f"文件未找到: {path}", "file_not_found")


def unsupported_format(
    ext: str, supported: str = "png, jpg, gif, webp, mp4"
) -> VisionError:
    return VisionError(
        f"不支持的媒体格式: {ext}，支持: {supported}", "unsupported_format"
    )


def auth_failed() -> VisionError:
    return VisionError(
        "API Key 无效，请检查 AGNES_API_KEY 环境变量", "auth_failed"
    )


def api_error(status_code: int, message: str) -> VisionError:
    return VisionError(f"API 错误 ({status_code}): {message}", "api_error")


def timeout(retries: int) -> VisionError:
    return VisionError(f"请求超时，已重试 {retries} 次", "timeout")


def connection_failed() -> VisionError:
    return VisionError("无法连接到 API 服务", "connection_failed")


def missing_param(param_name: str, example: str = "") -> VisionError:
    msg = f"缺少必选参数: {param_name}"
    if example:
        msg += f"，示例: {example}"
    return VisionError(msg, "missing_param")
