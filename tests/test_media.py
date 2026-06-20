"""utils/media 模块测试"""
import os
import base64
import struct
import zlib
from unittest.mock import AsyncMock, MagicMock
import pytest
from mcp_vision_server.utils.media import (
    is_url,
    is_local_file,
    local_to_data_uri,
    resolve_media_input,
    download_to_base64,
)
from mcp_vision_server.utils.errors import VisionError


def create_png(width: int = 1, height: int = 1) -> bytes:
    """创建一个最小的有效 PNG 文件内容"""
    def chunk(chunk_type: bytes, data: bytes) -> bytes:
        c = chunk_type + data
        crc = struct.pack(">I", zlib.crc32(c) & 0xFFFFFFFF)
        return struct.pack(">I", len(data)) + c + crc

    header = b"\x89PNG\r\n\x1a\n"
    ihdr = chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0))
    raw = b""
    for _ in range(height):
        raw += b"\x00" + b"\xff\x00\x00" * width
    idat = chunk(b"IDAT", zlib.compress(raw))
    iend = chunk(b"IEND", b"")
    return header + ihdr + idat + iend


class TestIsUrl:
    def test_http_url(self):
        assert is_url("https://example.com/img.png") is True

    def test_https_url(self):
        assert is_url("http://cdn.example.com/video.mp4") is True

    def test_local_path(self):
        assert is_url("/home/user/img.png") is False

    def test_relative_path(self):
        assert is_url("../images/photo.jpg") is False

    def test_data_uri(self):
        assert is_url("data:image/png;base64,abc123") is False


class TestIsLocalFile:
    def test_local_file_exists(self, tmp_path):
        p = tmp_path / "test.png"
        p.write_bytes(b"dummy")
        assert is_local_file(str(p)) is True

    def test_url_is_not_local_file(self):
        assert is_local_file("https://example.com/img.png") is False

    def test_nonexistent_path(self):
        assert is_local_file("/nonexistent/path/file.png") is False

    def test_data_uri_is_not_local_file(self):
        assert is_local_file("data:image/png;base64,abc") is False


class TestLocalToDataUri:
    def test_png_image(self, tmp_path):
        """PNG 文件转 data URI"""
        png_data = create_png(1, 1)
        png_path = tmp_path / "test.png"
        png_path.write_bytes(png_data)

        uri = local_to_data_uri(str(png_path))
        assert uri.startswith("data:image/png;base64,")
        b64_part = uri.split(",", 1)[1]
        decoded = base64.b64decode(b64_part)
        assert decoded[:8] == b"\x89PNG\r\n\x1a\n"

    def test_file_not_found(self):
        with pytest.raises(VisionError, match="文件未找到"):
            local_to_data_uri("/nonexistent/path/image.png")

    def test_unsupported_extension(self, tmp_path):
        p = tmp_path / "doc.pdf"
        p.write_bytes(b"fake pdf")
        with pytest.raises(VisionError, match="不支持的媒体格式"):
            local_to_data_uri(str(p))


class TestResolveMediaInput:
    def test_http_url_is_passthrough(self):
        result = resolve_media_input("https://example.com/img.png")
        assert result == {"type": "url", "value": "https://example.com/img.png"}

    def test_local_file_is_data_uri(self, tmp_path):
        png = create_png(1, 1)
        path = tmp_path / "img.png"
        path.write_bytes(png)

        result = resolve_media_input(str(path))
        assert result["type"] == "data_uri"
        assert result["value"].startswith("data:image/png;base64,")

    def test_nonexistent_local_file(self, tmp_path):
        with pytest.raises(VisionError, match="文件未找到"):
            resolve_media_input(str(tmp_path / "nonexistent.png"))


class TestDownloadToBase64:
    @pytest.mark.asyncio
    async def test_download_success(self):
        client = MagicMock()
        client.get = AsyncMock()
        response = MagicMock()
        response.content = b"\x89PNG\r\n\x1a\n"
        response.headers = {"content-type": "image/png"}
        client.get.return_value = response

        expected = "data:image/png;base64," + base64.b64encode(b"\x89PNG\r\n\x1a\n").decode("ascii")
        result = await download_to_base64("https://example.com/img.png", client)
        assert result == expected

    @pytest.mark.asyncio
    async def test_download_http_error(self):
        client = MagicMock()
        client.get = AsyncMock()
        response = MagicMock()
        response.raise_for_status.side_effect = Exception("HTTP 404")
        client.get.return_value = response

        with pytest.raises(Exception, match="HTTP 404"):
            await download_to_base64("https://example.com/bad.png", client)
