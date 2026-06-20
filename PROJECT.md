# MCP Vision Server — 项目文档

> **给接手这个项目的 AI（或人类）开发者。**  
> 本文档包含你需要的 **所有信息**：项目是什么、怎么构建的、每个文件的职责、已知问题、如何运行测试、如何修改。

---

## 1. 项目概述

| 项 | 详情 |
|----|------|
| 项目名称 | `mcp-vision-server` |
| 版本 | `0.2.0` |
| 位置 | `D:\AI Project\mcp-vision-server\` |
| 语言 | Python 3.12（最低要求 3.11） |
| 代码行数 | ~1800 行（含测试） |
| 测试数量 | 86 个 |
| 提交数量 | 13 次 commit |
| 设计文档 | `D:\AI Project\docs\superpowers\specs\2026-06-20-mcp-vision-server-design.md` |
| 实施计划 | `D:\AI Project\docs\superpowers\plans\2026-06-20-mcp-vision-server.md` |

### 这个项目做什么？

一个 **MCP（Model Context Protocol）服务**，通过 stdio 通信为没有视觉能力的 AI 模型（如 DeepSeek V4 Pro）提供 7 个视觉工具。后端支持多种 AI API 提供商，按任务类型**自动路由**到最优模型。

### 用户怎么用？

在 Claude Code 的 `.claude/settings.local.json` 中配置后，对话中自动可用：

```
用户: "帮我看看这张图片里有什么"         → 自动调用 analyze_image
用户: "提取这个截图里的文字"             → 自动调用 extract_text
用户: "生成一张日落的图片"               → 自动调用 generate_image
用户: "把这张图的背景换成蓝色天空"       → 自动调用 edit_image
用户: "分析这个视频的内容"               → 自动调用 analyze_video
用户: "根据这个描述生成视频"             → 自动调用 generate_video
用户: "当前有哪些可用的 AI 服务？"       → 自动调用 list_providers
```

---

## 2. 架构概览

```
                    ┌──────────────────────────────────────────┐
                    │           ProviderRegistry              │
                    │  按 Capability 自动路由到最优 Provider    │
                    │                                          │
                    │  ┌──────────┐ ┌──────┐ ┌─────────────┐  │
                    │  │  OpenAI  │ │ Agnes│ │ Custom/其他  │  │
                    │  └────┬─────┘ └──┬───┘ └──────┬──────┘  │
                    │       │           │             │         │
                    └───────┼───────────┼─────────────┼────────┘
                            │           │             │
                    ┌───────┴───────────┴─────────────┴────────┐
                    │     OpenAI 兼容 HTTP API (httpx)         │
                    └───────┬───────────┬─────────────┬────────┘
                            │           │             │
                    ┌───────┴─────┐ ┌───┴──────┐ ┌───┴────────┐
                    │ OpenAI API   │ │Agnes API │ │自部署 vLLM  │
                    │ (gpt-4o等)   │ │          │ │Ollama 等    │
                    └─────────────┘ └─────────┘ └────────────┘
```

**核心概念**：
- **BaseProvider (ABC)**: 所有 Provider 必须实现的统一接口
- **Capability (Enum)**: VISION / IMAGE_GENERATION / IMAGE_EDIT / VIDEO_ANALYSIS / VIDEO_GENERATION
- **ProviderRegistry**: 注册所有 Provider，按 Capability 路由到最佳 Provider
- **OpenAICompatibleProvider**: 通用适配器，连接任何 OpenAI 兼容端点
- **PROVIDER_CATALOG**: 内置已知 Provider 的默认配置

**数据流**（以 analyze_image 为例）：

```
用户说 "分析这张图"
  → Claude 调用 MCP 工具 analyze_image(image_url="D:/photo.png")
  → server.py 路由到 TOOL_CAPABILITY["analyze_image"] → Capability.VISION
  → registry.get_for_capability(Capability.VISION) → 选择最优 Provider
  → provider.chat_completion(messages=..., model=...) → HTTP POST
  → API 返回 {"choices":[{"message":{"content":"描述文字..."}}]}
  → 提取 choices[0].message.content → 返回给 Claude → 展示给用户
```

---

## 3. 完整文件清单及职责

### 3.1 核心运行时文件

| 文件 | 行数 | 一句话职责 | 关键函数/类 |
|------|------|-----------|------------|
| `mcp_vision_server/__init__.py` | 1 | 包标识 | — |
| `mcp_vision_server/__main__.py` | 5 | `python -m` 入口 | 调用 `asyncio.run(main())` |
| `mcp_vision_server/config.py` | 85 | 环境变量 → 配置常量（多Provider） | `AGNES_*`, `OPENAI_*`, `VISION_PROVIDER`, `CUSTOM_*` 等 |
| `mcp_vision_server/client.py` | 122 | AgnesClient（向后兼容） | `AgnesClient` 类 |
| `mcp_vision_server/server.py` | 320 | MCP 协议层：工具注册+路由+Provider选择+启动 | `TOOLS`, `handle_call_tool()`, `main()`, `_resolve_model()` |
| `mcp_vision_server/providers/__init__.py` | 5 | Provider 包公开接口 | — |
| `mcp_vision_server/providers/base.py` | 50 | ABC 接口+Capability 枚举 | `BaseProvider`, `Capability` |
| `mcp_vision_server/providers/catalog.py` | 62 | 内置 Provider 默认配置 | `PROVIDER_CATALOG` |
| `mcp_vision_server/providers/registry.py` | 220 | Provider 注册+按能力路由+模块单例 | `ProviderRegistry`, `get_registry()`, `TOOL_CAPABILITY` |
| `mcp_vision_server/providers/adapters/__init__.py` | 3 | Adapter 子包 | — |
| `mcp_vision_server/providers/adapters/openai_compat.py` | 135 | 通用 OpenAI 兼容适配器 | `OpenAICompatibleProvider` |
| `mcp_vision_server/utils/errors.py` | 48 | 统一异常体系 | `VisionError` 类 + 7 个工厂函数 |
| `mcp_vision_server/utils/media.py` | 82 | 媒体预处理：URL判断/base64 | `is_url()`, `local_to_data_uri()`, `resolve_media_input()`, `download_to_base64()` |
| `mcp_vision_server/tools/analyze_image.py` | 55 | 图片分析+OCR | `handle_analyze_image()`, `handle_extract_text()` |
| `mcp_vision_server/tools/generate_image.py` | 68 | 文生图+图片编辑 | `handle_generate_image()`, `handle_edit_image()` |
| `mcp_vision_server/tools/video.py` | 99 | 视频分析+文生视频 | `handle_analyze_video()`, `handle_generate_video()` |

### 3.2 测试文件

| 文件 | 测试数 | 覆盖模块 |
|------|--------|----------|
| `tests/test_config.py` | 9 | config.py |
| `tests/test_errors.py` | 9 | utils/errors.py |
| `tests/test_media.py` | 17 | utils/media.py |
| `tests/test_client.py` | 10 | client.py |
| `tests/test_tools_analyze.py` | 4 | tools/analyze_image.py |
| `tests/test_tools_generate.py` | 3 | tools/generate_image.py |
| `tests/test_tools_video.py` | 3 | tools/video.py |
| `tests/providers/test_registry.py` | 16 | providers/registry.py |
| `tests/providers/test_openai_compat.py` | 15 | providers/adapters/openai_compat.py |

### 3.3 配置文件

| 文件 | 用途 |
|------|------|
| `pyproject.toml` | 包元信息 + 依赖声明 |
| `README.md` | 用户文档：安装、配置、环境变量 |
| `.gitignore` | Git 忽略规则 |

---

## 4. 7 个工具详解

### `analyze_image` — 图片理解/描述

| 属性 | 值 |
|------|-----|
| 输入 | `image_url`（必填，URL或本地路径）, `prompt`（可选）, `model`（可选）, `provider`（可选） |
| 输出 | 文字描述 |
| 核心代码 | `tools/analyze_image.py:25-36` |
| Provider 能力 | Capability.VISION |
| 默认提示词 | "请详细描述这张图片的内容。" |
| 本地文件处理 | `resolve_media_input()` → base64 data URI → `image_url` content block |

### `extract_text` — OCR 文字提取

| 属性 | 值 |
|------|-----|
| 输入 | `image_url`（必填）, `language`（可选，如"中文"） |
| 输出 | 提取的文字 |
| 核心代码 | `tools/analyze_image.py:39-53` |
| 提示词 | 自动拼接："请提取这张图片中的所有文字内容（语言: xxx）。只返回提取的文字，不要添加额外说明。" |

### `generate_image` — 文生图

| 属性 | 值 |
|------|-----|
| 输入 | `prompt`（必填）, `size`（默认 1024x1024）, `style`（可选）, `n`（默认 1） |
| 输出 | base64 图片列表 |
| 核心代码 | `tools/generate_image.py:8-35` |
| Provider 能力 | Capability.IMAGE_GENERATION |
| 推荐模型 | agnes-image-2.1-flash / dall-e-3 |

### `edit_image` — 图片编辑/修复

| 属性 | 值 |
|------|-----|
| 输入 | `image_url`（必填）, `prompt`（必填）, `mask_url`（可选） |
| 输出 | 文字结果 |
| 核心代码 | `tools/generate_image.py:38-68` |
| Provider 能力 | Capability.IMAGE_EDIT |

### `analyze_video` — 视频分析/摘要

| 属性 | 值 |
|------|-----|
| 输入 | `video_url`（必填）, `prompt`（可选）, `fps`（可选） |
| 输出 | 文字描述/摘要 |
| 核心代码 | `tools/video.py:12-38` |
| Provider 能力 | Capability.VIDEO_ANALYSIS |

### `generate_video` — 文生视频

| 属性 | 值 |
|------|-----|
| 输入 | `prompt`（必填）, `duration`（默认 5s）, `resolution`（默认 1080p） |
| 输出 | 视频 data URI 列表 |
| 核心代码 | `tools/video.py:41-77` |
| Provider 能力 | Capability.VIDEO_GENERATION |

### `list_providers` — 查看可用服务（v0.2 新增）

| 属性 | 值 |
|------|-----|
| 输入 | 无 |
| 输出 | 已配置的 Provider 列表、能力、默认模型、路由信息 |
| 核心代码 | `server.py:_handle_list_providers()` |

---

## 5. 错误处理机制

### VisionError 体系

所有错误统一为 `VisionError(message, error_type)`。7 个工厂函数：

```python
file_not_found(path)           # error_type="file_not_found"
unsupported_format(ext)        # error_type="unsupported_format"
auth_failed()                  # error_type="auth_failed"
api_error(status, msg)         # error_type="api_error"
timeout(retries)               # error_type="timeout"
connection_failed()            # error_type="connection_failed"
missing_param(name, example)   # error_type="missing_param"
```

### client.py 中的重试逻辑

| 状态码 | 行为 |
|--------|------|
| 401 | **不重试**，立即抛出 `auth_failed()` |
| 429 | 读取 `Retry-After` 头，等待后重试（最多 3 次） |
| 4xx 其他 | **不重试**，立即抛出 `api_error()` |
| 5xx | 指数退避重试（1s → 2s → 4s），最多 3 次 |
| 超时 | 指数退避重试，最多 3 次 |
| 连接失败 | 指数退避重试，最多 3 次 |

### server.py 中的错误捕获

```python
try:
    ...  # 工具调用
except VisionError as e:
    → "❌ {中文错误消息}"
except Exception as e:
    → "❌ 服务内部错误: {str(e)}"
```

---

## 6. MCP SDK 关键适配

计划中的 `InitializationCapabilities` 在 `mcp>=1.0` 中**不存在**，实际实现使用：

```python
from mcp.server.models import InitializationOptions
from mcp.types import ServerCapabilities, ToolsCapability

InitializationOptions(
    server_name="vision-server",
    server_version="0.1.0",
    capabilities=ServerCapabilities(
        tools=ToolsCapability(listChanged=True),
    ),
)
```

**`NotificationOptions`** 在早期 commit 中曾被导入但从未使用，已在 `0dd3aaf` 提交中移除。

---

## 7. 已探明的 Agnes AI API 详情

### 端点

| 端点 | 方法 | 用途 | 状态 |
|------|------|------|------|
| `/v1/models` | GET | 列出可用模型 | ✅ |
| `/v1/chat/completions` | POST | 聊天/视觉理解（OpenAI 兼容） | ✅ |
| `/v1/images/generations` | POST | 图片生成 | ✅ |

### 模型清单

| 模型 | 能力 | 推荐用途 |
|------|------|----------|
| `agnes-2.0-flash` | 多模态文本+视觉理解 | **默认模型**，analyze_image/extract_text |
| `agnes-1.5-flash` | 多模态文本 | 纯文本对话 |
| `agnes-image-2.1-flash` | 图片生成 | generate_image |
| `agnes-image-2.0-flash` | 图片生成 | generate_image（备选） |
| `agnes-video-v2.0` | 视频 | analyze_video/generate_video |

### 鉴权方式

```
Authorization: Bearer sk-xxx
Content-Type: application/json
```

---

## 8. 环境变量完整参考

### 核心配置（多 Provider 选择）

| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `VISION_PROVIDER` | 否 | `""` | 全局默认 Provider（`openai`/`agnes`/`openrouter`/`groq`/`custom`） |
| `IMAGE_PROVIDER` | 否 | `""` | 图片任务专用 Provider（覆盖 VISION_PROVIDER） |
| `VIDEO_PROVIDER` | 否 | `""` | 视频任务专用 Provider（覆盖 VISION_PROVIDER） |
| `PROVIDER_FALLBACK` | 否 | `""` | 备选 Provider 列表，逗号分隔（如 `openai,agnes`） |

### 按任务指定模型

| 变量 | 适用工具 | 说明 |
|------|----------|------|
| `VISION_MODEL` | analyze_image, extract_text | 覆盖 Provider 默认视觉模型 |
| `IMAGE_GEN_MODEL` | generate_image | 覆盖 Provider 默认图片生成模型 |
| `IMAGE_EDIT_MODEL` | edit_image | 覆盖 Provider 默认编辑模型 |
| `VIDEO_ANALYSIS_MODEL` | analyze_video | 覆盖 Provider 默认视频分析模型 |
| `VIDEO_GEN_MODEL` | generate_video | 覆盖 Provider 默认视频生成模型 |

### Agnes AI 配置（向后兼容）

| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `AGNES_API_KEY` | 否* | `""` | Agnes AI API Key |
| `AGNES_BASE_URL` | 否 | `https://apihub.agnes-ai.com/v1` | Agnes API 端点 |
| `AGNES_DEFAULT_MODEL` | 否 | `agnes-2.0-flash` | Agnes 默认模型 |
| `AGNES_TIMEOUT` | 否 | `120.0` | HTTP 请求超时（秒） |
| `AGNES_MAX_RETRIES` | 否 | `3` | 最大重试次数 |

> *如果只使用 Agnes 而不设置其他 Provider，则 AGNES_API_KEY 为必填。

### 其他 Provider

| 变量 | Provider | 说明 |
|------|----------|------|
| `OPENAI_API_KEY` | OpenAI | OpenAI API Key |
| `OPENAI_BASE_URL` | OpenAI | 覆盖默认端点 |
| `OPENROUTER_API_KEY` | OpenRouter | OpenRouter API Key |
| `GROQ_API_KEY` | Groq | Groq API Key |
| `CUSTOM_API_KEY` | 自定义 | 自部署端点的 API Key |
| `CUSTOM_BASE_URL` | 自定义 | 自部署端点的地址 |
| `CUSTOM_PROVIDER_NAME` | 自定义 | 显示名称（默认 `custom`） |

---

## 9. 如何修改

### 9.1 添加新工具

1. 在 `tools/` 下新建文件，实现 `async def handle_xxx(client: OpenAICompatibleProvider, **params) -> str`
2. 在 `server.py` 的 `_get_all_tools()` 中添加 `Tool(...)` 定义
3. 判断新工具需要什么 Capability，在 `TOOL_CAPABILITY` 中添加映射（`registry.py`）
4. 在 `server.py` 的 `handle_call_tool()` 中添加 `elif name == "xxx":` 分支
5. 在 `tests/` 下添加对应测试文件
6. 运行 `python -m pytest tests/ -v` 验证

### 9.2 添加新的 API Provider

1. 在 `providers/catalog.py` 的 `PROVIDER_CATALOG` 中添加条目（base_url, capabilities, default_models）
2. 在 `config.py` 中添加对应的 API Key 环境变量
3. 在 `providers/registry.py` 的 `_build_registry_from_config()` 的 `known_keys` 字典中添加
4. 如果 API 格式非 OpenAI 兼容 → 在 `providers/adapters/` 下新建适配器，实现 `BaseProvider` 接口

### 9.3 修改默认模型

方式 1：设置环境变量（推荐，无需改代码）
```json
{ "env": { "VISION_MODEL": "gpt-4o-mini" } }
```

方式 2：修改 `catalog.py` 中对应 Provider 的 `default_models`

### 9.4 调整路由优先级

修改 `providers/registry.py` 中的 `_build_registry_from_config()` 函数的注册顺序。先注册的 Provider 优先级更高。

### 9.5 调整重试策略

- 全局：改 `providers/adapters/openai_compat.py` 中 `_request()` 方法的 `self._max_retries` 和 `await asyncio.sleep(2 ** retries)`
- 按 Provider：在 `catalog.py` 中设置 `timeout_env` 和 `retries_env` 环境变量名

---

## 10. 运行和测试

### 安装

```bash
cd "D:\AI Project\mcp-vision-server"
pip install -e ".[dev]"
```

### 运行全部测试

```bash
# Windows
"C:/Users/Bencat2359/AppData/Local/Programs/Python/Python312/python.exe" -m pytest tests/ -v

# 或如果用 PATH 中的 Python
python -m pytest tests/ -v
```

期望输出：**86 passed in ~60s**

### 手动测试 MCP 服务

```bash
# 测试服务启动
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}' | python -m mcp_vision_server

# 期望输出: {"jsonrpc":"2.0","id":1,"result":{"protocolVersion":"2024-11-05","capabilities":{"tools":{"listChanged":true}},"serverInfo":{"name":"vision-server","version":"0.2.0"}}}
```

### 测试多 Provider 切换

```bash
# 测试向后兼容（仅有 AGNES_API_KEY）
AGNES_API_KEY=sk-test python -c "
from mcp_vision_server.providers.registry import get_registry, reset_registry
reset_registry()
r = get_registry()
print('Providers:', r.list_providers())
"

# 测试切换到 OpenAI
VISION_PROVIDER=openai OPENAI_API_KEY=sk-test OPENAI_BASE_URL=https://api.openai.com/v1 python -c "
from mcp_vision_server.providers.registry import get_registry, reset_registry
reset_registry()
import os
os.environ.setdefault('VISION_PROVIDER', 'openai')
"

# 测试混合 Provider 配置
VISION_PROVIDER=openai IMAGE_PROVIDER=agnes OPENAI_API_KEY=sk-openai AGNES_API_KEY=sk-agnes python -c "
from mcp_vision_server.providers.registry import get_registry, reset_registry
reset_registry()
r = get_registry()
print(r.list_providers())
"
```

---

## 11. Git 历史摘要

| Commit | 内容 |
|--------|------|
| `dd29dde` | 项目脚手架 |
| `4747e55` | 配置模块 |
| `3cc82b8` | 错误处理模块 |
| `838558e` | 媒体预处理 |
| `366ba02` | API 客户端 |
| `9f32258` | 图片分析工具 |
| `c9c57a5` | 图片生成工具 |
| `e91c19b` | 视频处理工具 |
| `80a6c8d` | Task 8 评审修复（死分支/类型契约/空断言） |
| `de16c6d` | MCP Server 主入口 |
| `2bd2b73` | README 文档 |
| `0dd3aaf` | 修复默认模型 + 死分支 + 未使用导入 |

---

## 12. 已知局限和注意事项

1. **仅支持 stdio**，不支持 HTTP/SSE 远程部署
2. **无流式响应**，所有请求为一次性完整响应
3. **大视频文件**不建议用本地路径（base64 膨胀 33%），用 HTTP URL
4. **edit_image** 的实际效果取决于 API 模型能力
5. **generate_video** 的输出格式取决于 API 响应（可能是 URL/文本/base64）
6. **Provider 能力声明**是静态的（来自 catalog），不通过 API 探测
7. **health_check()** 当前仅返回 True，未实现实际的 API 可用性探测
8. **Windows 终端编码**：直接运行时中文可能显示乱码，MCP 协议层面无此问题
9. **Pillow** 已安装但当前未被核心流程使用（设计层面预留用于未来本地图片格式检测优化）
10. **VISION_PROVIDERS_CONFIG**（JSON 格式高级配置）已预留但本期不解析

---

## 13. 目录树总览

```
mcp-vision-server/
├── .git/
│   └── sdd/                          # 开发过程记录（计划/报告/评审）
├── mcp_vision_server/
│   ├── __init__.py                   # 包标识
│   ├── __main__.py                   # python -m 入口
│   ├── config.py                     # 配置常量（多 Provider）
│   ├── client.py                     # AgnesClient（向后兼容）
│   ├── server.py                     # MCP 协议层（工具注册 + Provider路由 + 启动）
│   ├── providers/                    # ← v0.2 新增：Provider 抽象层
│   │   ├── __init__.py
│   │   ├── base.py                   # BaseProvider ABC + Capability 枚举
│   │   ├── catalog.py                # 内置 Provider 默认配置
│   │   ├── registry.py               # ProviderRegistry + 路由 + TOOL_CAPABILITY
│   │   └── adapters/
│   │       ├── __init__.py
│   │       └── openai_compat.py      # 通用 OpenAI 兼容适配器
│   ├── tools/
│   │   ├── __init__.py
│   │   ├── analyze_image.py          # handle_analyze_image + handle_extract_text
│   │   ├── generate_image.py         # handle_generate_image + handle_edit_image
│   │   └── video.py                  # handle_analyze_video + handle_generate_video
│   └── utils/
│       ├── __init__.py
│       ├── errors.py                 # VisionError + 7 工厂函数
│       └── media.py                  # is_url / local_to_data_uri / resolve_media_input
├── tests/
│   ├── __init__.py
│   ├── test_config.py
│   ├── test_errors.py
│   ├── test_media.py
│   ├── test_client.py
│   ├── test_tools_analyze.py
│   ├── test_tools_generate.py
│   ├── test_tools_video.py
│   └── providers/                    # ← v0.2 新增测试
│       ├── __init__.py
│       ├── test_registry.py
│       └── test_openai_compat.py
├── pyproject.toml                    # 包元信息 + 依赖
├── README.md                         # 用户文档
├── PROJECT.md                        # ← 你正在读的文件
├── .gitignore
└── ../../docs/superpowers/
    ├── specs/2026-06-20-mcp-vision-server-design.md   # 设计文档
    └── plans/2026-06-20-mcp-vision-server.md          # 实施计划
```
