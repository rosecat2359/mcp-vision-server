"""ProviderRegistry — 多 Provider 注册、按能力路由、自动发现"""
import os
import logging
from typing import Dict, List, Optional, Iterable

from .base import BaseProvider, Capability
from .catalog import PROVIDER_CATALOG, resolve_capabilities
from .adapters.openai_compat import OpenAICompatibleProvider
from ..utils.errors import VisionError

logger = logging.getLogger("mcp-vision-server.registry")

# ── 工具 → 能力映射 ──

TOOL_CAPABILITY: Dict[str, Capability] = {
    "analyze_image":  Capability.VISION,
    "extract_text":   Capability.VISION,
    "generate_image": Capability.IMAGE_GENERATION,
    "edit_image":     Capability.IMAGE_EDIT,
    "analyze_video":  Capability.VIDEO_ANALYSIS,
    "generate_video": Capability.VIDEO_GENERATION,
}


def _env(name: str, default: str = "") -> str:
    return os.environ.get(name, default).strip()


class ProviderRegistry:
    """多 Provider 注册中心

    使用方式:
        registry = get_registry()
        provider = registry.get_for_capability(Capability.VISION)
        result = await provider.chat_completion(...)
    """

    def __init__(self) -> None:
        self._providers: Dict[str, BaseProvider] = {}
        # capability → [provider_names] （按注册顺序，即优先级顺序）
        self._cap_index: Dict[Capability, List[str]] = {c: [] for c in Capability}

    # ── 注册 ──

    def register(self, provider: BaseProvider) -> None:
        """注册一个 Provider（后注册者优先级更低）"""
        if provider.name in self._providers:
            return  # 已注册，跳过

        self._providers[provider.name] = provider
        for cap in provider.capabilities:
            if provider.name not in self._cap_index[cap]:
                self._cap_index[cap].append(provider.name)

        logger.info("已注册 Provider: %s caps=%s", provider.name,
                     [c.value for c in provider.capabilities])

    # ── 查询 ──

    def get_provider(self, name: str) -> Optional[BaseProvider]:
        """按名称获取 Provider"""
        return self._providers.get(name)

    def get_for_capability(
        self,
        capability: Capability,
        preferred: Optional[str] = None,
    ) -> BaseProvider:
        """按能力获取最佳 Provider

        优先级:
        1. preferred — 调用方显式指定的 provider 名称
        2. 注册顺序（先注册的优先级更高）
        """
        candidates = self._cap_index.get(capability, [])

        # 如果指定了 preferred，尝试将其提升到最前
        if preferred and preferred in self._providers:
            provider = self._providers[preferred]
            if capability in provider.capabilities:
                return provider
            # preferred 不支持此能力，回退到默认
            logger.warning(
                "指定的 Provider '%s' 不支持 '%s'，回退到默认",
                preferred, capability.value
            )

        if not candidates:
            raise VisionError(
                f"没有可用的 Provider 支持 '{capability.value}'。"
                f"已注册的 Provider: {list(self._providers.keys())}。"
                f"请检查环境变量配置（API Key、Provider 选择等）。",
                "no_provider",
            )

        return self._providers[candidates[0]]

    def get_default_model(
        self,
        capability: Capability,
        provider_name: Optional[str] = None,
    ) -> Optional[str]:
        """获取指定能力+Provider 的默认模型"""
        if provider_name:
            provider = self._providers.get(provider_name)
        else:
            candidates = self._cap_index.get(capability, [])
            if not candidates:
                return None
            provider = self._providers.get(candidates[0])
        if provider:
            return provider.default_model_for(capability)
        return None

    # ── 列表 ──

    def list_providers(self) -> List[dict]:
        """列出所有已注册 Provider 的信息（用于 MCP list_providers 工具）"""
        result = []
        for name, p in self._providers.items():
            result.append({
                "name": name,
                "base_url": p.base_url,
                "capabilities": [c.value for c in p.capabilities],
                "models": {
                    c.value: p.default_model_for(c)
                    for c in p.capabilities
                    if p.default_model_for(c)
                },
            })
        return result

    def list_models_for(self, capability: Capability) -> List[dict]:
        """列出某能力所有可用的 Provider+模型组合"""
        result = []
        for name in self._cap_index.get(capability, []):
            p = self._providers[name]
            model = p.default_model_for(capability)
            result.append({
                "provider": name,
                "model": model,
                "base_url": p.base_url,
            })
        return result

    def __len__(self) -> int:
        return len(self._providers)

    def __bool__(self) -> bool:
        return len(self._providers) > 0


# ── 模块级单例 ──

_registry: Optional[ProviderRegistry] = None


def get_registry() -> ProviderRegistry:
    """获取全局 ProviderRegistry 单例（惰性初始化）"""
    global _registry
    if _registry is None:
        _registry = _build_registry_from_config()
    return _registry


def reset_registry() -> None:
    """重置全局 Registry（测试用）"""
    global _registry
    _registry = None


# ── 从环境变量构建 Registry ──

def _build_registry_from_config() -> ProviderRegistry:
    """根据环境变量自动发现并注册 Provider"""
    from ..config import (
        AGNES_API_KEY, AGNES_BASE_URL, AGNES_TIMEOUT, AGNES_MAX_RETRIES,
        OPENAI_API_KEY, OPENAI_BASE_URL,
        OPENROUTER_API_KEY, OPENROUTER_BASE_URL,
        GROQ_API_KEY, GROQ_BASE_URL,
        VISION_PROVIDER, IMAGE_PROVIDER, VIDEO_PROVIDER,
        PROVIDER_FALLBACK,
        CUSTOM_BASE_URL, CUSTOM_API_KEY, CUSTOM_PROVIDER_NAME,
    )

    registry = ProviderRegistry()

    # ── 辅助：构建注册顺序 ──
    # 先收集哪些 Provider 被显式引用（赋予更高优先级）
    preferred_names: List[str] = []
    for env_val in [VISION_PROVIDER, IMAGE_PROVIDER, VIDEO_PROVIDER]:
        if env_val and env_val not in preferred_names:
            preferred_names.append(env_val)

    # 反向解析 PROVIDER_FALLBACK（最后面的最低优先级）
    fallback_list: List[str] = []
    if PROVIDER_FALLBACK:
        fallback_list = [n.strip() for n in PROVIDER_FALLBACK.split(",") if n.strip()]

    # ── 构建注册候选列表（按优先级） ──
    # 1. 先注册 preferred_names 中的 Provider
    # 2. 再注册 fallback_list 中不在 preferred 里的
    # 3. 最后注册其他有 API Key 的 Provider

    to_register: List[str] = list(preferred_names)
    for name in fallback_list:
        if name not in to_register:
            to_register.append(name)

    # 检测哪些 Provider 有 API Key
    known_keys: Dict[str, str] = {
        "agnes": AGNES_API_KEY,
        "openai": OPENAI_API_KEY,
        "openrouter": OPENROUTER_API_KEY,
        "groq": GROQ_API_KEY,
    }

    # 所有 API Key 已就绪且未被列出的已知 Provider，按 catalog 顺序追加
    for name in PROVIDER_CATALOG:
        if name not in to_register and known_keys.get(name):
            to_register.append(name)

    # custom provider 如果在列表中也注册
    if "custom" in to_register:
        to_register.remove("custom")
        to_register.insert(0, "custom")  # custom 总是最高优先级

    # ── 逐一注册 ──

    registered = set()

    # 自定义 Provider
    if CUSTOM_API_KEY and CUSTOM_BASE_URL:
        _register_custom(registry, CUSTOM_PROVIDER_NAME, CUSTOM_BASE_URL,
                         CUSTOM_API_KEY, AGNES_TIMEOUT, AGNES_MAX_RETRIES, registered)

    # 已知 Provider
    for name in to_register:
        if name == "custom" or name in registered:
            continue
        entry = PROVIDER_CATALOG.get(name)
        if entry is None:
            logger.warning("未知 Provider 名称: '%s'，已跳过", name)
            continue

        api_key = known_keys.get(name, "")
        if not api_key:
            logger.info("Provider '%s' 的 API Key 未设置，跳过注册", name)
            continue

        _register_from_catalog(registry, name, entry, api_key, registered)

    # ── 回退：如果什么都没注册但有 AGNES_API_KEY ──
    if not registry and AGNES_API_KEY:
        entry = PROVIDER_CATALOG["agnes"]
        _register_from_catalog(registry, "agnes", entry, AGNES_API_KEY, registered)

    # ── 再次回退：如果都没注册，尝试用 AGNES_* 配置注册为 default ──
    if not registry and AGNES_API_KEY:
        # 这通常意味着 catalog 中没有匹配项（理论上不会发生）
        provider = OpenAICompatibleProvider(
            name="default",
            base_url=AGNES_BASE_URL,
            api_key=AGNES_API_KEY,
            capabilities=resolve_capabilities(
                PROVIDER_CATALOG["agnes"]["capabilities"]
            ),
            default_models={
                Capability[c]: m
                for c, m in PROVIDER_CATALOG["agnes"]["default_models"].items()
            },
            timeout_seconds=AGNES_TIMEOUT,
            max_retries=AGNES_MAX_RETRIES,
        )
        registry.register(provider)

    logger.info("ProviderRegistry 初始化完成: %d 个 Provider", len(registry))
    return registry


def _register_from_catalog(
    registry: ProviderRegistry,
    name: str,
    entry: dict,
    api_key: str,
    registered: set,
) -> None:
    """从 catalog 条目注册一个已知 Provider"""
    import os as _os

    # 使用环境变量覆盖 catalog 中的 base_url
    base_url_env = entry.get("base_url_env", "")
    base_url = _os.environ.get(base_url_env, entry["base_url"]) if base_url_env else entry["base_url"]

    # 使用环境变量覆盖 timeout / retries（如果有定义）
    timeout_seconds = 120.0
    retries = 3
    if entry.get("timeout_env"):
        val = _os.environ.get(entry["timeout_env"])
        if val:
            try:
                timeout_seconds = float(val)
            except ValueError:
                pass
    if entry.get("retries_env"):
        val = _os.environ.get(entry["retries_env"])
        if val:
            try:
                retries = int(val)
            except ValueError:
                pass

    provider = OpenAICompatibleProvider(
        name=name,
        base_url=base_url,
        api_key=api_key,
        capabilities=resolve_capabilities(entry["capabilities"]),
        default_models={
            Capability[c]: m
            for c, m in entry["default_models"].items()
        },
        timeout_seconds=timeout_seconds,
        max_retries=retries,
    )
    registry.register(provider)
    registered.add(name)


def _register_custom(
    registry: ProviderRegistry,
    name: str,
    base_url: str,
    api_key: str,
    timeout_seconds: float,
    max_retries: int,
    registered: set,
) -> None:
    """注册用户自定义 Provider"""
    provider_name = name or "custom"
    provider = OpenAICompatibleProvider(
        name=provider_name,
        base_url=base_url,
        api_key=api_key,
        capabilities=set(Capability),  # 全部能力声明支持
        timeout_seconds=timeout_seconds,
        max_retries=max_retries,
    )
    registry.register(provider)
    registered.add(provider_name)
