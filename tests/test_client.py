"""client 模块测试 — 使用 unittest.mock 模拟 httpx 请求"""
import json
import os
from unittest.mock import AsyncMock, patch

import httpx
import pytest

from mcp_vision_server.utils.errors import VisionError


@pytest.fixture
def client():
    """创建带测试 key 的 AgnesClient"""
    os.environ["AGNES_API_KEY"] = "sk-test-client"
    # 强制重新加载 config 和 client 模块，确保读到测试用的 key
    from importlib import reload
    import mcp_vision_server.config
    reload(mcp_vision_server.config)
    import mcp_vision_server.client
    reload(mcp_vision_server.client)
    from mcp_vision_server.client import AgnesClient

    return AgnesClient()


class TestClientInit:
    def test_headers_include_auth(self, client):
        assert "Authorization" in client.headers
        assert client.headers["Authorization"] == "Bearer sk-test-client"

    def test_base_url_no_trailing_slash(self):
        os.environ["AGNES_BASE_URL"] = "https://api.example.com/v1/"
        from importlib import reload
        import mcp_vision_server.config
        reload(mcp_vision_server.config)
        # 重新加载 client 模块，使用更新后的配置
        import mcp_vision_server.client as cli_mod
        reload(cli_mod)
        c = cli_mod.AgnesClient()
        assert c.base_url == "https://api.example.com/v1"
        # 清理环境变量，避免影响其他测试
        del os.environ["AGNES_BASE_URL"]
        reload(mcp_vision_server.config)


class TestChatCompletion:
    @pytest.mark.asyncio
    async def test_successful_request(self, client):
        """正常请求返回解析后的 JSON"""
        mock_response = httpx.Response(
            200,
            json={
                "choices": [{"message": {"content": "这张图片中有一只猫"}}]
            },
            request=httpx.Request("POST", "https://test/chat/completions"),
        )

        with patch.object(httpx.AsyncClient, "request", AsyncMock(return_value=mock_response)):
            result = await client.chat_completion(
                messages=[{"role": "user", "content": [{"type": "text", "text": "描述图片"}]}]
            )
            assert result["choices"][0]["message"]["content"] == "这张图片中有一只猫"

    @pytest.mark.asyncio
    async def test_401_raises_auth_error(self, client):
        """401 返回鉴权错误"""
        mock_response = httpx.Response(
            401,
            json={"error": "Unauthorized"},
            request=httpx.Request("POST", "https://test/chat/completions"),
        )
        with patch.object(httpx.AsyncClient, "request", AsyncMock(return_value=mock_response)):
            with pytest.raises(VisionError) as exc_info:
                await client.chat_completion(messages=[{"role": "user", "content": "hi"}])
            assert "API Key 无效" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_429_retry_then_success(self, client):
        """429 限流后重试，最终成功"""
        call_count = 0

        async def mock_request(self, method, url, **kwargs):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                return httpx.Response(
                    429,
                    headers={"Retry-After": "0"},
                    json={"error": "Too Many Requests"},
                    request=httpx.Request("POST", "https://test/chat/completions"),
                )
            return httpx.Response(
                200,
                json={"choices": [{"message": {"content": "成功"}}]},
                request=httpx.Request("POST", "https://test/chat/completions"),
            )

        with patch.object(httpx.AsyncClient, "request", mock_request):
            result = await client.chat_completion(messages=[{"role": "user", "content": "hi"}])
            assert result["choices"][0]["message"]["content"] == "成功"
            assert call_count == 2

    @pytest.mark.asyncio
    async def test_500_retry_then_raises(self, client):
        """500 服务端错误重试耗尽后抛出异常"""
        mock_response = httpx.Response(
            500,
            json={"error": "Internal Server Error"},
            request=httpx.Request("POST", "https://test/chat/completions"),
        )
        with patch.object(httpx.AsyncClient, "request", AsyncMock(return_value=mock_response)):
            with pytest.raises(VisionError) as exc_info:
                await client.chat_completion(messages=[{"role": "user", "content": "hi"}])
            assert "API 服务异常" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_timeout_retry_then_raises(self, client):
        """超时重试耗尽后抛出 timeout 错误"""
        import httpx

        with patch.object(
            httpx.AsyncClient, "request",
            AsyncMock(side_effect=httpx.TimeoutException("timeout"))
        ):
            with pytest.raises(VisionError) as exc_info:
                await client.chat_completion(messages=[{"role": "user", "content": "hi"}])
            assert "请求超时" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_connection_retry_then_raises(self, client):
        """连接失败重试耗尽后抛出 connection_failed 错误"""
        import httpx

        with patch.object(
            httpx.AsyncClient, "request",
            AsyncMock(side_effect=httpx.ConnectError("connection refused"))
        ):
            with pytest.raises(VisionError) as exc_info:
                await client.chat_completion(messages=[{"role": "user", "content": "hi"}])
            assert "无法连接到 API 服务" in str(exc_info.value)


class TestImageGeneration:
    @pytest.mark.asyncio
    async def test_successful_generation(self, client):
        """图片生成返回 data 数组"""
        mock_response = httpx.Response(
            200,
            json={"data": [{"url": "https://cdn.example.com/gen-001.png"}]},
            request=httpx.Request("POST", "https://test/images/generations"),
        )
        with patch.object(httpx.AsyncClient, "request", AsyncMock(return_value=mock_response)):
            result = await client.image_generation(prompt="一只猫")
            assert result["data"][0]["url"] == "https://cdn.example.com/gen-001.png"

    @pytest.mark.asyncio
    async def test_custom_size_and_n(self, client):
        """自定义 size 和 n 参数"""
        mock_response = httpx.Response(
            200,
            json={"data": [{"url": "url1"}, {"url": "url2"}]},
            request=httpx.Request("POST", "https://test/images/generations"),
        )
        with patch.object(httpx.AsyncClient, "request", AsyncMock(return_value=mock_response)):
            result = await client.image_generation(prompt="两只猫", size="512x512", n=2)
            assert len(result["data"]) == 2
