"""tools/analyze_image 测试 — mock API 客户端"""
import pytest
from unittest.mock import AsyncMock, MagicMock


@pytest.fixture
def mock_client():
    client = MagicMock()
    client.chat_completion = AsyncMock()
    return client


class TestAnalyzeImage:
    @pytest.mark.asyncio
    async def test_with_prompt(self, mock_client):
        """带 prompt 的图片分析"""
        mock_client.chat_completion.return_value = {
            "choices": [{"message": {"content": "这是一张风景照，有山有水"}}]
        }

        from mcp_vision_server.tools.analyze_image import handle_analyze_image

        result = await handle_analyze_image(
            mock_client,
            image_url="https://example.com/photo.jpg",
            prompt="描述风景",
        )

        assert "风景照" in result
        # 验证发送的 messages 包含图片和文字
        call_args = mock_client.chat_completion.call_args
        messages = call_args[1]["messages"]
        assert len(messages) == 1
        assert messages[0]["role"] == "user"
        content_list = messages[0]["content"]
        assert any(item["type"] == "image_url" for item in content_list)
        assert any("描述风景" in str(item) for item in content_list)

    @pytest.mark.asyncio
    async def test_default_prompt_when_none(self, mock_client):
        """未提供 prompt 时使用默认描述性提示"""
        mock_client.chat_completion.return_value = {
            "choices": [{"message": {"content": "图片中有一个人"}}]
        }

        from mcp_vision_server.tools.analyze_image import handle_analyze_image

        result = await handle_analyze_image(
            mock_client, image_url="https://example.com/photo.jpg"
        )

        call_args = mock_client.chat_completion.call_args
        messages = call_args[1]["messages"]
        # 应该使用默认描述提示词
        content_texts = [
            item["text"] for item in messages[0]["content"] if item["type"] == "text"
        ]
        assert any("描述" in t for t in content_texts)


class TestExtractText:
    @pytest.mark.asyncio
    async def test_extract_text(self, mock_client):
        """OCR 文字提取"""
        mock_client.chat_completion.return_value = {
            "choices": [{"message": {"content": "Hello World\n这是提取的文本"}}]
        }

        from mcp_vision_server.tools.analyze_image import handle_extract_text

        result = await handle_extract_text(
            mock_client, image_url="https://example.com/doc.png"
        )

        assert "Hello World" in result
        call_args = mock_client.chat_completion.call_args
        messages = call_args[1]["messages"]
        content_texts = [
            item["text"] for item in messages[0]["content"] if item["type"] == "text"
        ]
        assert any("提取" in t for t in content_texts)

    @pytest.mark.asyncio
    async def test_extract_text_with_language(self, mock_client):
        """带语言提示的 OCR"""
        mock_client.chat_completion.return_value = {
            "choices": [{"message": {"content": "你好世界"}}]
        }

        from mcp_vision_server.tools.analyze_image import handle_extract_text

        result = await handle_extract_text(
            mock_client, image_url="https://example.com/doc.png", language="中文"
        )

        call_args = mock_client.chat_completion.call_args
        messages = call_args[1]["messages"]
        content_texts = [
            item["text"] for item in messages[0]["content"] if item["type"] == "text"
        ]
        assert any("中文" in t for t in content_texts)
