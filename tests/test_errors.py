"""utils/errors 模块测试"""
from mcp_vision_server.utils.errors import (
    VisionError,
    file_not_found,
    unsupported_format,
    auth_failed,
    api_error,
    timeout,
    connection_failed,
    missing_param,
)


class TestVisionError:
    """VisionError 基类"""

    def test_basic_exception(self):
        """创建基本异常"""
        err = VisionError("测试错误")
        assert err.message == "测试错误"
        assert err.error_type == "internal"
        assert "测试错误" in str(err)

    def test_custom_type(self):
        """自定义错误类型"""
        err = VisionError("自定义", error_type="custom_type")
        assert err.error_type == "custom_type"


class TestErrorFactories:
    """错误工厂函数"""

    def test_file_not_found(self):
        err = file_not_found("/tmp/img.png")
        assert "文件未找到" in err.message
        assert "/tmp/img.png" in err.message
        assert err.error_type == "file_not_found"

    def test_unsupported_format(self):
        err = unsupported_format(".bmp")
        assert "不支持的媒体格式" in err.message
        assert ".bmp" in err.message
        assert err.error_type == "unsupported_format"

    def test_auth_failed(self):
        err = auth_failed()
        assert "API Key 无效" in err.message
        assert err.error_type == "auth_failed"

    def test_api_error(self):
        err = api_error(500, "Internal error")
        assert "500" in err.message
        assert err.error_type == "api_error"

    def test_timeout(self):
        err = timeout(3)
        assert "超时" in err.message
        assert "3" in err.message
        assert err.error_type == "timeout"

    def test_connection_failed(self):
        err = connection_failed()
        assert "无法连接" in err.message
        assert err.error_type == "connection_failed"

    def test_missing_param(self):
        err = missing_param("image_url", example="https://example.com/img.jpg")
        assert "缺少必选参数" in err.message
        assert "image_url" in err.message
        assert "https://example.com/img.jpg" in err.message
        assert err.error_type == "missing_param"
