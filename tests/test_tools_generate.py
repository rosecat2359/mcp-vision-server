"""tools/generate_image 测试"""
import pytest
from unittest.mock import AsyncMock, MagicMock


@pytest.fixture
def mock_client():
    client = MagicMock()
    client.chat_completion = AsyncMock()
    client.image_generation = AsyncMock()
    return client


class TestGenerateImage:
    @pytest.mark.asyncio
    async def test_generates_and_downloads(self, mock_client):
        """文生图：调用 API → 下载生成的图片 → 返回 base64"""
        mock_client.image_generation.return_value = {
            "data": [
                {"url": "https://cdn.example.com/result-1.png"},
                {"url": "https://cdn.example.com/result-2.png"},
            ]
        }

        # Mock download
        import base64

        async def fake_download(url, client):
            return f"data:image/png;base64,{base64.b64encode(b'fake_image_' + url.encode()).decode()}"

        import mcp_vision_server.tools.generate_image as gi

        original = gi.download_to_base64
        gi.download_to_base64 = lambda url, c: fake_download(url, c)
        try:
            result = await gi.handle_generate_image(
                mock_client,
                prompt="一只白色的猫",
                size="512x512",
                n=2,
            )
        finally:
            gi.download_to_base64 = original

        assert isinstance(result, list)
        assert len(result) == 2
        assert all(r.startswith("data:image/png;base64,") for r in result)
        # 验证 API 调用参数
        call_args = mock_client.image_generation.call_args
        assert call_args[1]["prompt"] == "一只白色的猫"
        assert call_args[1]["size"] == "512x512"
        assert call_args[1]["n"] == 2

    @pytest.mark.asyncio
    async def test_uses_defaults(self, mock_client):
        """未提供可选参数时使用默认值"""
        mock_client.image_generation.return_value = {
            "data": [{"url": "https://cdn.example.com/result.png"}]
        }

        async def fake_dl(url, client):
            return "data:image/png;base64,ZmFrZQ=="

        import mcp_vision_server.tools.generate_image as gi

        original = gi.download_to_base64
        gi.download_to_base64 = fake_dl
        try:
            result = await gi.handle_generate_image(
                mock_client, prompt="一只狗"
            )
        finally:
            gi.download_to_base64 = original

        call_args = mock_client.image_generation.call_args
        assert call_args[1]["size"] == "1024x1024"
        assert call_args[1]["n"] == 1


class TestEditImage:
    @pytest.mark.asyncio
    async def test_edit_image(self, mock_client):
        """图片编辑：发送原图 + mask + prompt"""
        mock_client.chat_completion.return_value = {
            "choices": [
                {"message": {"content": "已根据描述编辑图片"}}
            ]
        }

        from mcp_vision_server.tools.generate_image import handle_edit_image

        result = await handle_edit_image(
            mock_client,
            image_url="https://example.com/original.png",
            prompt="把背景换成蓝色天空",
        )

        assert "编辑" in result
        call_args = mock_client.chat_completion.call_args
        messages = call_args[1]["messages"]
        content = messages[0]["content"]
        # 应该包含图片和 prompt
        texts = [t["text"] for t in content if t["type"] == "text"]
        assert any("蓝色天空" in t for t in texts)
