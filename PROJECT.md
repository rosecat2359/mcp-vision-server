# MCP Vision Server — 项目文档

> **给接手这个项目的 AI（或人类）开发者。**  
> 本文档包含你需要的 **所有信息**：项目是什么、怎么构建的、每个文件的职责、已知问题、如何运行测试、如何修改。

---

## 1. 项目概述

| 项 | 详情 |
|----|------|
| 项目名称 | `mcp-vision-server` |
| 版本 | `0.1.0` |
| 位置 | `D:\AI Project\mcp-vision-server\` |
| 语言 | Python 3.12（最低要求 3.11） |
| 代码行数 | ~1100 行（含测试） |
| 测试数量 | 55 个 |
| 提交数量 | 12 次 commit |
| 设计文档 | `D:\AI Project\docs\superpowers\specs\2026-06-20-mcp-vision-server-design.md` |
| 实施计划 | `D:\AI Project\docs\superpowers\plans\2026-06-20-mcp-vision-server.md` |

### 这个项目做什么？

一个 **MCP（Model Context Protocol）服务**，通过 stdio 通信为没有视觉能力的 AI 模型（如 DeepSeek V4 Pro）提供 6 个视觉工具。后端对接 **Agnes AI API**。

### 用户怎么用？

在 Claude Code 的 `.claude/settings.local.json` 中配置后，对话中自动可用：

```
用户: "帮我看看这张图片里有什么"         → 自动调用 analyze_image
用户: "提取这个截图里的文字"             → 自动调用 extract_text
用户: "生成一张日落的图片"               → 自动调用 generate_image
用户: "把这张图的背景换成蓝色天空"       → 自动调用 edit_image
用户: "分析这个视频的内容"               → 自动调用 analyze_video
用户: "根据这个描述生成视频"             → 自动调用 generate_video
```

---

## 2. 架构概览

```
┌──────────┐      MCP stdio        ┌──────────────────┐        HTTPS          ┌────────────┐
│  Claude   │ ◄───────────────────► │  mcp-vision-server │ ◄───────────────────► │  Agnes AI   │
│  (MCP宿主) │    JSON-RPC 2.0      │  (Python 子进程)   │   Bearer sk-xxx     │  API        │
└──────────┘                       └──────────────────┘                       └────────────┘
```

**数据流**（以 analyze_image 为例）：

```
用户说 "分析这张图"
  → Claude 调用 MCP 工具 analyze_image(image_url="D:/photo.png")
  → server.py 路由到 handle_analyze_image()
  → utils/media.py: resolve_media_input() 检测本地文件 → 读为 base64 → data URI
  → tools/analyze_image.py: 构建 vision message（image_url + text prompt）
  → client.py: POST /v1/chat/completions（Bearer 认证, 120s 超时, 3 次重试）
  → Agnes AI 返回 {"choices":[{"message":{"content":"描述文字..."}}]}
  → 提取 choices[0].message.content → 返回给 Claude → 展示给用户
```

---

## 3. 完整文件清单及职责

### 3.1 核心运行时文件

| 文件 | 行数 | 一句话职责 | 关键函数/类 |
|------|------|-----------|------------|
| `mcp_vision_server/__init__.py` | 1 | 包标识 | — |
| `mcp_vision_server/__main__.py` | 5 | `python -m` 入口 | 调用 `asyncio.run(main())` |
| `mcp_vision_server/config.py` | 31 | 环境变量 → 配置常量 | `AGNES_API_KEY`, `AGNES_BASE_URL`, `AGNES_DEFAULT_MODEL`, `AGNES_TIMEOUT`, `AGNES_MAX_RETRIES` |
| `mcp_vision_server/client.py` | 110 | HTTP 客户端：鉴权+重试+错误 | `AgnesClient` 类, `chat_completion()`, `image_generation()`, `_request()` |
| `mcp_vision_server/server.py` | 293 | MCP 协议层：工具注册+路由+启动 | `server` 实例, `TOOLS` 列表, `handle_list_tools()`, `handle_call_tool()`, `main()` |
| `mcp_vision_server/utils/errors.py` | 48 | 统一异常体系 | `VisionError` 类 + 7 个工厂函数 |
| `mcp_vision_server/utils/media.py` | 82 | 媒体预处理：URL判断/base64 | `is_url()`, `local_to_data_uri()`, `resolve_media_input()`, `download_to_base64()` |
| `mcp_vision_server/tools/analyze_image.py` | 52 | 图片分析+OCR | `handle_analyze_image()`, `handle_extract_text()`, `_build_vision_message()` |
| `mcp_vision_server/tools/generate_image.py` | 66 | 文生图+图片编辑 | `handle_generate_image()`, `handle_edit_image()` |
| `mcp_vision_server/tools/video.py` | 95 | 视频分析+文生视频 | `handle_analyze_video()`, `handle_generate_video()` |

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

### 3.3 配置文件

| 文件 | 用途 |
|------|------|
| `pyproject.toml` | 包元信息 + 依赖声明 |
| `README.md` | 用户文档：安装、配置、环境变量 |
| `.gitignore` | Git 忽略规则 |

---

## 4. 6 个工具详解

### `analyze_image` — 图片理解/描述

| 属性 | 值 |
|------|-----|
| 输入 | `image_url`（必填，URL或本地路径）, `prompt`（可选）, `model`（可选） |
| 输出 | 文字描述 |
| 核心代码 | `tools/analyze_image.py:25-40` |
| API 端点 | `POST /v1/chat/completions` |
| 默认提示词 | "请详细描述这张图片的内容。" |
| 本地文件处理 | `resolve_media_input()` → base64 data URI → `image_url` content block |

### `extract_text` — OCR 文字提取

| 属性 | 值 |
|------|-----|
| 输入 | `image_url`（必填）, `language`（可选，如"中文"） |
| 输出 | 提取的文字 |
| 核心代码 | `tools/analyze_image.py:43-56` |
| 提示词 | 自动拼接："请提取这张图片中的所有文字内容（语言: xxx）。只返回提取的文字，不要添加额外说明。" |

### `generate_image` — 文生图

| 属性 | 值 |
|------|-----|
| 输入 | `prompt`（必填）, `size`（默认 1024x1024）, `style`（可选）, `n`（默认 1） |
| 输出 | base64 图片列表 |
| 核心代码 | `tools/generate_image.py:11-36` |
| API 端点 | `POST /v1/images/generations` |
| 推荐模型 | `agnes-image-2.1-flash`（当前 client.py 的 `image_generation` 方法使用默认模型，需传入 model 参数指定） |

### `edit_image` — 图片编辑/修复

| 属性 | 值 |
|------|-----|
| 输入 | `image_url`（必填）, `prompt`（必填）, `mask_url`（可选，蒙版标记编辑区域） |
| 输出 | 文字结果 |
| 核心代码 | `tools/generate_image.py:38-66` |
| API 端点 | `POST /v1/chat/completions`（以 vision message 形式发送） |
| 注意 | 此功能依赖 API 对图片编辑的支持，实际效果取决于模型能力 |

### `analyze_video` — 视频分析/摘要

| 属性 | 值 |
|------|-----|
| 输入 | `video_url`（必填）, `prompt`（可选）, `fps`（可选） |
| 输出 | 文字描述/摘要 |
| 核心代码 | `tools/video.py:8-44` |
| 注意事项 | 视频文件通常较大，base64 编码后体积膨胀 33%，大文件建议用 URL |

### `generate_video` — 文生视频

| 属性 | 值 |
|------|-----|
| 输入 | `prompt`（必填）, `duration`（默认 5s）, `resolution`（默认 1080p） |
| 输出 | 视频 data URI 列表 |
| 核心代码 | `tools/video.py:47-95` |
| 注意事项 | 视频生成耗时较长，返回结果取决于 API 是否直接返回视频 URL 或文本描述 |

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

| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `AGNES_API_KEY` | **是** | `""` | 空字符串时服务仍启动但会打印警告 |
| `AGNES_BASE_URL` | 否 | `https://apihub.agnes-ai.com/v1` | 自动去除尾部 `/` |
| `AGNES_DEFAULT_MODEL` | 否 | `agnes-2.0-flash` | 用于 chat_completion 的默认模型 |
| `AGNES_TIMEOUT` | 否 | `120.0` | HTTP 请求超时（秒） |
| `AGNES_MAX_RETRIES` | 否 | `3` | 最大重试次数 |

---

## 9. 如何修改

### 9.1 添加新工具

1. 在 `tools/` 下新建文件（如 `tools/face_detect.py`），实现 `async def handle_xxx(client, **params) -> str`
2. 在 `server.py` 的 `TOOLS` 列表中添加 `Tool(...)` 定义
3. 在 `server.py` 的 `handle_call_tool()` 中添加 `elif name == "xxx":` 分支
4. 在 `tests/` 下添加对应测试文件
5. 运行 `python -m pytest tests/ -v` 验证

### 9.2 修改默认模型

改 `config.py` 第 29 行：
```python
AGNES_DEFAULT_MODEL = os.environ.get("AGNES_DEFAULT_MODEL", "你的模型名")
```

同时更新 `tests/test_config.py:27-30` 中的断言。

### 9.3 调整重试策略

改 `client.py` 中 `_request()` 方法的:
- `self.max_retries` — 最大重试次数
- `await asyncio.sleep(2 ** retries)` — 退避时间（当前 1s→2s→4s）

### 9.4 更改 API 端点

`client.py` 中:
- `chat_completion()` → `self._request("POST", "/chat/completions", ...)` — 改这里
- `image_generation()` → `self._request("POST", "/images/generations", ...)` — 改这里

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

期望输出：**55 passed in ~45s**

### 手动测试 MCP 服务

```bash
# 测试服务启动
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}' | python -m mcp_vision_server

# 期望输出: {"jsonrpc":"2.0","id":1,"result":{"protocolVersion":"2024-11-05","capabilities":{"tools":{"listChanged":true}},"serverInfo":{"name":"vision-server","version":"0.1.0"}}}
```

### 直接调用 API（调试用）

```bash
export AGNES_API_KEY="sk-xxx"
python -c "
import asyncio
from mcp_vision_server.client import AgnesClient
from mcp_vision_server.tools.analyze_image import handle_analyze_image

async def main():
    client = AgnesClient()
    result = await handle_analyze_image(client, image_url='https://example.com/photo.jpg')
    print(result)

asyncio.run(main())
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
4. **edit_image** 的实际效果取决于 Agnes AI 模型能力
5. **generate_video** 的输出格式取决于 API 响应（可能是 URL/文本/base64）
6. **图片生成默认模型**需要在调用时指定 `model='agnes-image-2.1-flash'`，client.py 的 `image_generation()` 未硬编码图片模型
7. **Windows 终端编码**：直接运行时中文可能显示乱码，MCP 协议层面无此问题
8. **Pillow** 已安装但当前未被核心流程使用（设计层面预留用于未来本地图片格式检测优化）

---

## 13. 目录树总览

```
mcp-vision-server/
├── .git/
│   └── sdd/                          # 开发过程记录（计划/报告/评审）
├── mcp_vision_server/
│   ├── __init__.py                   # 包标识
│   ├── __main__.py                   # python -m 入口
│   ├── config.py                     # 配置常量
│   ├── client.py                     # AgnesClient (HTTP + 重试)
│   ├── server.py                     # MCP 协议层（工具注册 + 路由 + 启动）
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
│   └── test_tools_video.py
├── pyproject.toml                    # 包元信息 + 依赖
├── README.md                         # 用户文档
├── PROJECT.md                        # ← 你正在读的文件
├── .gitignore
└── ../../docs/superpowers/
    ├── specs/2026-06-20-mcp-vision-server-design.md   # 设计文档
    └── plans/2026-06-20-mcp-vision-server.md          # 实施计划
```
