"""OpenAICompatibleProvider 测试 — 使用 httpx mock"""
import os
import pytest
import httpx
from unittest.mock import AsyncMock, patch

from mcp_vision_server.providers.base import Capability
from mcp_vision_server.providers.adapters.openai_compat import OpenAICompatibleProvider
from mcp_vision_server.utils.errors import VisionError


@pytest.fixture
def openai_provider():
    return OpenAICompatibleProvider(
        name="openai",
        base_url="https://api.openai.com/v1",
        api_key="sk-test-123",
        capabilities={Capability.VISION, Capability.IMAGE_GENERATION},
        default_models={
            Capability.VISION: "gpt-4o",
            Capability.IMAGE_GENERATION: "dall-e-3",
        },
    )


class TestProviderAttributes:
    """Provider 基本属性"""

    def test_name(self, openai_provider):
        assert openai_provider.name == "openai"

    def test_base_url_no_trailing_slash(self):
        provider = OpenAICompatibleProvider(
            name="test", base_url="https://api.example.com/v1/",
            api_key="sk-test"
        )
        assert provider.base_url == "https://api.example.com/v1"

    def test_capabilities(self, openai_provider):
        assert Capability.VISION in openai_provider.capabilities
        assert Capability.IMAGE_GENERATION in openai_provider.capabilities

    def test_default_model_for(self, openai_provider):
        assert openai_provider.default_model_for(Capability.VISION) == "gpt-4o"
        assert openai_provider.default_model_for(Capability.VIDEO_ANALYSIS) is None

    @pytest.mark.asyncio
    async def test_health_check(self, openai_provider):
        result = await openai_provider.health_check()
        assert result is True

    def test_repr(self, openai_provider):
        r = repr(openai_provider)
        assert "openai" in r


class TestChatCompletion:
    """chat_completion API 测试"""

    @pytest.mark.asyncio
    async def test_successful_request(self, openai_provider):
        mock_response = httpx.Response(
            200,
            json={"choices": [{"message": {"content": "一只猫"}}]},
            request=httpx.Request("POST", "https://api.openai.com/v1/chat/completions"),
        )
        with patch.object(httpx.AsyncClient, "request", AsyncMock(return_value=mock_response)):
            result = await openai_provider.chat_completion(
                messages=[{"role": "user", "content": "描述图片"}]
            )
            assert result["choices"][0]["message"]["content"] == "一只猫"

    @pytest.mark.asyncio
    async def test_uses_custom_model(self, openai_provider):
        mock_response = httpx.Response(
            200,
            json={"choices": [{"message": {"content": "ok"}}]},
            request=httpx.Request("POST", "https://test/chat/completions"),
        )
        with patch.object(httpx.AsyncClient, "request", AsyncMock(return_value=mock_response)):
            await openai_provider.chat_completion(
                messages=[{"role": "user", "content": "hi"}],
                model="gpt-4o-mini",
            )
            call_args = httpx.AsyncClient.request.call_args
            json_data = call_args[1]["json"]
            assert json_data["model"] == "gpt-4o-mini"

    @pytest.mark.asyncio
    async def test_401_raises_auth_error(self, openai_provider):
        mock_response = httpx.Response(
            401, json={"error": "Unauthorized"},
            request=httpx.Request("POST", "https://test/chat/completions"),
        )
        with patch.object(httpx.AsyncClient, "request", AsyncMock(return_value=mock_response)):
            with pytest.raises(VisionError) as exc_info:
                await openai_provider.chat_completion(messages=[{"role": "user", "content": "hi"}])
            assert "API Key 无效" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_500_retry_then_raises(self, openai_provider):
        mock_response = httpx.Response(
            500, json={"error": "Internal Server Error"},
            request=httpx.Request("POST", "https://test/chat/completions"),
        )
        with patch.object(httpx.AsyncClient, "request", AsyncMock(return_value=mock_response)):
            with pytest.raises(VisionError) as exc_info:
                await openai_provider.chat_completion(messages=[{"role": "user", "content": "hi"}])
            assert "API 服务异常" in str(exc_info.value)


class TestImageGeneration:
    """image_generation API 测试"""

    @pytest.mark.asyncio
    async def test_successful_generation(self, openai_provider):
        mock_response = httpx.Response(
            200,
            json={"data": [{"url": "https://cdn.example.com/img.png"}]},
            request=httpx.Request("POST", "https://api.openai.com/v1/images/generations"),
        )
        with patch.object(httpx.AsyncClient, "request", AsyncMock(return_value=mock_response)):
            result = await openai_provider.image_generation(prompt="日落")
            assert result["data"][0]["url"] == "https://cdn.example.com/img.png"

    @pytest.mark.asyncio
    async def test_uses_default_model(self, openai_provider):
        mock_response = httpx.Response(
            200,
            json={"data": [{"url": "url1"}]},
            request=httpx.Request("POST", "https://test/images/generations"),
        )
        with patch.object(httpx.AsyncClient, "request", AsyncMock(return_value=mock_response)):
            await openai_provider.image_generation(prompt="测试")
            call_args = httpx.AsyncClient.request.call_args
            json_data = call_args[1]["json"]
            assert json_data["model"] == "dall-e-3"

    @pytest.mark.asyncio
    async def test_custom_model_overrides_default(self, openai_provider):
        mock_response = httpx.Response(
            200,
            json={"data": [{"url": "url1"}]},
            request=httpx.Request("POST", "https://test/images/generations"),
        )
        with patch.object(httpx.AsyncClient, "request", AsyncMock(return_value=mock_response)):
            await openai_provider.image_generation(prompt="测试", model="dall-e-2")
            call_args = httpx.AsyncClient.request.call_args
            json_data = call_args[1]["json"]
            assert json_data["model"] == "dall-e-2"
