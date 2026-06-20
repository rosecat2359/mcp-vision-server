# MCP Vision Server

为 DeepSeek V4 Pro 等无原生视觉能力的模型提供视觉服务的 MCP Server。

> **v0.2.0** — 现已支持多 Provider（OpenAI、OpenRouter、Groq、自定义端点等），自动按任务类型路由到最优模型。

## 功能

| 工具 | 功能 |
|------|------|
| `analyze_image` | 图片理解/描述/分类 |
| `extract_text` | OCR 文字提取 |
| `generate_image` | 文生图 |
| `edit_image` | 图片编辑/修复 |
| `analyze_video` | 视频理解/摘要 |
| `generate_video` | 文生视频 |
| `list_providers` | 列出所有已配置的 AI Provider 及模型 |

## 安装

```bash
pip install -e ".[dev]"
```

## 配置

### 级别 1：单 Provider（Agnes AI — 与 v0.1 完全兼容）

```json
{
  "mcpServers": {
    "vision": {
      "command": "python",
      "args": ["-m", "mcp_vision_server"],
      "env": {
        "AGNES_API_KEY": "sk-xxx"
      }
    }
  }
}
```

### 级别 2：一键切换到 OpenAI

```json
{
  "mcpServers": {
    "vision": {
      "command": "python",
      "args": ["-m", "mcp_vision_server"],
      "env": {
        "VISION_PROVIDER": "openai",
        "OPENAI_API_KEY": "sk-xxx"
      }
    }
  }
}
```

### 级别 3：按任务分配不同 Provider

```json
{
  "mcpServers": {
    "vision": {
      "command": "python",
      "args": ["-m", "mcp_vision_server"],
      "env": {
        "VISION_PROVIDER": "openai",
        "IMAGE_PROVIDER": "agnes",
        "VIDEO_PROVIDER": "agnes",
        "OPENAI_API_KEY": "sk-openai-xxx",
        "AGNES_API_KEY": "sk-agnes-xxx",
        "VISION_MODEL": "gpt-4o",
        "IMAGE_GEN_MODEL": "dall-e-3"
      }
    }
  }
}
```

### 自定义端点（自部署模型）

```json
{
  "mcpServers": {
    "vision": {
      "env": {
        "VISION_PROVIDER": "custom",
        "CUSTOM_BASE_URL": "http://localhost:8080/v1",
        "CUSTOM_API_KEY": "sk-local-xxx"
      }
    }
  }
}
```

## 支持的 Provider

| Provider | 环境变量 | 默认端点 | 能力 |
|----------|---------|----------|------|
| **Agnes AI** | `AGNES_API_KEY` | `apihub.agnes-ai.com/v1` | Vision, Image Gen, Image Edit, Video |
| **OpenAI** | `OPENAI_API_KEY` | `api.openai.com/v1` | Vision, Image Gen, Image Edit |
| **OpenRouter** | `OPENROUTER_API_KEY` | `openrouter.ai/api/v1` | Vision, Image Edit |
| **Groq** | `GROQ_API_KEY` | `api.groq.com/openai/v1` | Vision |
| **自定义** | `CUSTOM_API_KEY` + `CUSTOM_BASE_URL` | 自定 | 全部 |

## 环境变量完整参考

### Provider 选择

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `VISION_PROVIDER` | 默认 Provider 名称 | 自动检测 |
| `IMAGE_PROVIDER` | 图片任务专用 Provider | 跟随 VISION_PROVIDER |
| `VIDEO_PROVIDER` | 视频任务专用 Provider | 跟随 VISION_PROVIDER |
| `PROVIDER_FALLBACK` | 备选 Provider 列表（逗号分隔） | — |

### 模型覆盖

| 变量 | 适用工具 | 说明 |
|------|----------|------|
| `VISION_MODEL` | analyze_image, extract_text | 视觉理解模型 |
| `IMAGE_GEN_MODEL` | generate_image | 文生图模型 |
| `IMAGE_EDIT_MODEL` | edit_image | 图片编辑模型 |
| `VIDEO_ANALYSIS_MODEL` | analyze_video | 视频分析模型 |
| `VIDEO_GEN_MODEL` | generate_video | 视频生成模型 |

### Agnes AI（向后兼容）

| 变量 | 必填 | 默认值 |
|------|------|--------|
| `AGNES_API_KEY` | 否* | — |
| `AGNES_BASE_URL` | 否 | `https://apihub.agnes-ai.com/v1` |
| `AGNES_DEFAULT_MODEL` | 否 | `agnes-2.0-flash` |
| `AGNES_TIMEOUT` | 否 | `120` |
| `AGNES_MAX_RETRIES` | 否 | `3` |

> *如果只使用 Agnes 而不设置其他 Provider，则 AGNES_API_KEY 为必填。

### 其他 Provider 密钥

| 变量 | 说明 |
|------|------|
| `OPENAI_API_KEY` | OpenAI API Key |
| `OPENROUTER_API_KEY` | OpenRouter API Key |
| `GROQ_API_KEY` | Groq API Key |
| `CUSTOM_API_KEY` | 自定义端点 API Key |
| `CUSTOM_BASE_URL` | 自定义端点地址 |

## 路由规则

工具调用时，Provider 选择优先级为：

1. **工具参数指定** — 如果 tool call 里传了 `provider` 参数
2. **环境变量按任务指定** — 如 `IMAGE_PROVIDER=agnes`
3. **全局默认** — `VISION_PROVIDER` 的值
4. **自动检测** — 第一个具有所需能力的已注册 Provider

## 使用示例

配置完成后，在 Claude Code 中直接使用：

- "帮我看看这张图片里有什么" → 自动调用 `analyze_image`
- "提取这张截图里的文字" → 自动调用 `extract_text`
- "生成一张猫的图片" → 自动调用 `generate_image`
- "分析这个视频的内容" → 自动调用 `analyze_video`
- "当前有哪些可用的 AI 服务？" → 自动调用 `list_providers`

## 测试

```bash
python -m pytest tests/ -v
```

## 技术栈

- Python 3.11+
- MCP SDK (stdio)
- httpx (HTTP)
- Pillow (图片处理)
