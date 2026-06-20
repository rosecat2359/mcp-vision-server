"""config 模块测试"""
import os


class TestConfigDefaults:
    """默认值测试 — 不设环境变量时的回退值"""

    def test_default_base_url(self):
        """未设 AGNES_BASE_URL 时使用 agnes-ai.com"""
        os.environ.pop("AGNES_BASE_URL", None)
        from mcp_vision_server.config import AGNES_BASE_URL
        assert AGNES_BASE_URL == "https://apihub.agnes-ai.com/v1"

    def test_default_timeout(self):
        """未设 AGNES_TIMEOUT 时默认 120"""
        os.environ.pop("AGNES_TIMEOUT", None)
        from mcp_vision_server.config import AGNES_TIMEOUT
        assert AGNES_TIMEOUT == 120.0

    def test_default_max_retries(self):
        """未设 AGNES_MAX_RETRIES 时默认 3"""
        os.environ.pop("AGNES_MAX_RETRIES", None)
        from mcp_vision_server.config import AGNES_MAX_RETRIES
        assert AGNES_MAX_RETRIES == 3

    def test_default_model(self):
        """未设 AGNES_DEFAULT_MODEL 时默认 'default'"""
        os.environ.pop("AGNES_DEFAULT_MODEL", None)
        from mcp_vision_server.config import AGNES_DEFAULT_MODEL
        assert AGNES_DEFAULT_MODEL == "default"


class TestConfigFromEnv:
    """环境变量读取测试"""

    def test_reads_api_key(self):
        """读取 AGNES_API_KEY"""
        os.environ["AGNES_API_KEY"] = "sk-test-123"
        from importlib import reload
        import mcp_vision_server.config
        reload(mcp_vision_server.config)
        assert mcp_vision_server.config.AGNES_API_KEY == "sk-test-123"

    def test_reads_custom_timeout(self):
        """读取自定义超时"""
        os.environ["AGNES_TIMEOUT"] = "60"
        from importlib import reload
        import mcp_vision_server.config
        reload(mcp_vision_server.config)
        assert mcp_vision_server.config.AGNES_TIMEOUT == 60.0

    def test_reads_custom_base_url(self):
        """读取自定义 URL"""
        os.environ["AGNES_BASE_URL"] = "http://localhost:8080"
        from importlib import reload
        import mcp_vision_server.config
        reload(mcp_vision_server.config)
        assert mcp_vision_server.config.AGNES_BASE_URL == "http://localhost:8080"

    def test_reads_custom_model(self):
        """读取自定义模型"""
        os.environ["AGNES_DEFAULT_MODEL"] = "gpt-4-vision"
        from importlib import reload
        import mcp_vision_server.config
        reload(mcp_vision_server.config)
        assert mcp_vision_server.config.AGNES_DEFAULT_MODEL == "gpt-4-vision"

    def test_reads_custom_max_retries(self):
        """读取自定义重试次数"""
        os.environ["AGNES_MAX_RETRIES"] = "5"
        from importlib import reload
        import mcp_vision_server.config
        reload(mcp_vision_server.config)
        assert mcp_vision_server.config.AGNES_MAX_RETRIES == 5
