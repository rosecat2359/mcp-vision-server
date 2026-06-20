# MCP Vision Server

为 DeepSeek V4 Pro 等无原生视觉能力的模型提供视觉服务的 MCP Server。

## 功能

| 工具 | 功能 |
|------|------|
| `analyze_image` | 图片理解/描述/分类 |
| `extract_text` | OCR 文字提取 |
| `generate_image` | 文生图 |
| `edit_image` | 图片编辑/修复 |
| `analyze_video` | 视频理解/摘要 |
| `generate_video` | 文生视频 |

## 安装

```bash
pip install -e ".[dev]"
```

## 配置

### Claude Code (settings.json)

```json
{
  "mcpServers": {
    "vision": {
      "command": "python",
      "args": ["-m", "mcp_vision_server"],
      "env": {
        "AGNES_API_KEY": "sk-xxx",
        "AGNES_BASE_URL": "https://apihub.agnes-ai.com/v1"
      }
    }
  }
}
```

### 环境变量

| 变量 | 必填 | 默认值 |
|------|------|--------|
| `AGNES_API_KEY` | 是 | — |
| `AGNES_BASE_URL` | 否 | `https://apihub.agnes-ai.com/v1` |
| `AGNES_DEFAULT_MODEL` | 否 | `default` |
| `AGNES_TIMEOUT` | 否 | `120` |
| `AGNES_MAX_RETRIES` | 否 | `3` |

## 使用示例

配置完成后，在 Claude Code 中直接使用：

- "帮我看看这张图片里有什么" → 自动调用 `analyze_image`
- "提取这张截图里的文字" → 自动调用 `extract_text`
- "生成一张猫的图片" → 自动调用 `generate_image`
- "分析这个视频的内容" → 自动调用 `analyze_video`

## 测试

```bash
python -m pytest tests/ -v
```

## 技术栈

- Python 3.11+
- MCP SDK (stdio)
- httpx (HTTP)
- Pillow (图片处理)
