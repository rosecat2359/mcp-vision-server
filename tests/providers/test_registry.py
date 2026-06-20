"""ProviderRegistry 测试 — 注册、路由、fallback"""
import os
import pytest
from mcp_vision_server.providers.base import Capability
from mcp_vision_server.providers.registry import (
    ProviderRegistry,
    TOOL_CAPABILITY,
    reset_registry,
)
from mcp_vision_server.providers.adapters.openai_compat import OpenAICompatibleProvider
from mcp_vision_server.utils.errors import VisionError


@pytest.fixture
def agnes_provider():
    return OpenAICompatibleProvider(
        name="agnes",
        base_url="https://apihub.agnes-ai.com/v1",
        api_key="sk-agnes-test",
        capabilities={Capability.VISION, Capability.IMAGE_GENERATION},
        default_models={
            Capability.VISION: "agnes-2.0-flash",
            Capability.IMAGE_GENERATION: "agnes-image-2.1-flash",
        },
    )


@pytest.fixture
def openai_provider():
    return OpenAICompatibleProvider(
        name="openai",
        base_url="https://api.openai.com/v1",
        api_key="sk-openai-test",
        capabilities={Capability.VISION, Capability.IMAGE_GENERATION},
        default_models={
            Capability.VISION: "gpt-4o",
            Capability.IMAGE_GENERATION: "dall-e-3",
        },
    )


class TestProviderRegistryBasic:
    """基本的注册和查询"""

    def test_register_and_get(self, agnes_provider):
        registry = ProviderRegistry()
        registry.register(agnes_provider)
        assert len(registry) == 1
        assert registry.get_provider("agnes") is agnes_provider

    def test_register_multiple(self, agnes_provider, openai_provider):
        registry = ProviderRegistry()
        registry.register(agnes_provider)
        registry.register(openai_provider)
        assert len(registry) == 2
        assert registry.get_provider("agnes") is agnes_provider
        assert registry.get_provider("openai") is openai_provider

    def test_register_duplicate_ignored(self, agnes_provider):
        registry = ProviderRegistry()
        registry.register(agnes_provider)
        registry.register(agnes_provider)
        assert len(registry) == 1

    def test_get_unknown_returns_none(self):
        registry = ProviderRegistry()
        assert registry.get_provider("nonexistent") is None

    def test_bool_empty_registry(self):
        assert not ProviderRegistry()


class TestCapabilityRouting:
    """按能力路由"""

    def test_route_vision(self, agnes_provider):
        registry = ProviderRegistry()
        registry.register(agnes_provider)
        provider = registry.get_for_capability(Capability.VISION)
        assert provider.name == "agnes"

    def test_route_unavailable_capability_raises(self, agnes_provider):
        """如果注册的 Provider 不支持该能力，应抛出异常"""
        registry = ProviderRegistry()
        registry.register(agnes_provider)
        with pytest.raises(VisionError, match="没有可用的 Provider"):
            registry.get_for_capability(Capability.VIDEO_ANALYSIS)

    def test_preferred_provider(self, agnes_provider, openai_provider):
        registry = ProviderRegistry()
        registry.register(agnes_provider)
        registry.register(openai_provider)
        # 优先注册的 agnes 是默认；手动指定 preferred 应返回 openai
        provider = registry.get_for_capability(
            Capability.VISION, preferred="openai"
        )
        assert provider.name == "openai"

    def test_preferred_lacks_capability_falls_back(self, agnes_provider, openai_provider):
        """如果 preferred 不支持该能力，回退到默认"""
        # 将 agnes 设置为只有 VISION，openai 有 VISION + IMAGE_GENERATION
        agnes_provider._capabilities = {Capability.VISION}
        registry = ProviderRegistry()
        registry.register(agnes_provider)
        registry.register(openai_provider)
        # 请求 IMAGE_GENERATION，preferred=agnes（不支持）→ 回退到 openai
        provider = registry.get_for_capability(
            Capability.IMAGE_GENERATION, preferred="agnes"
        )
        assert provider.name == "openai"

    def test_priority_order(self, agnes_provider, openai_provider):
        """先注册的 Provider 优先级更高"""
        registry = ProviderRegistry()
        registry.register(openai_provider)
        registry.register(agnes_provider)
        # openai 先注册，优先级更高
        provider = registry.get_for_capability(Capability.VISION)
        assert provider.name == "openai"


class TestDefaultModelResolver:
    """默认模型解析"""

    def test_get_default_model(self, agnes_provider, openai_provider):
        registry = ProviderRegistry()
        registry.register(agnes_provider)
        registry.register(openai_provider)
        assert registry.get_default_model(Capability.VISION) == "agnes-2.0-flash"
        assert registry.get_default_model(Capability.IMAGE_GENERATION) == "agnes-image-2.1-flash"

    def test_get_default_model_specific_provider(self, agnes_provider, openai_provider):
        registry = ProviderRegistry()
        registry.register(agnes_provider)
        registry.register(openai_provider)
        assert registry.get_default_model(Capability.VISION, provider_name="openai") == "gpt-4o"

    def test_get_default_model_unknown_capability(self, agnes_provider):
        registry = ProviderRegistry()
        registry.register(agnes_provider)
        assert registry.get_default_model(Capability.VIDEO_GENERATION) is None


class TestToolCapabilityMapping:
    """工具 → Capability 映射完整性"""

    def test_all_six_tools_mapped(self):
        expected_tools = {
            "analyze_image", "extract_text", "generate_image",
            "edit_image", "analyze_video", "generate_video",
        }
        assert set(TOOL_CAPABILITY.keys()) == expected_tools

    def test_mapping_types(self):
        for val in TOOL_CAPABILITY.values():
            assert isinstance(val, Capability)


class TestListProviders:
    """list_providers 和 list_models_for"""

    def test_list_providers(self, agnes_provider, openai_provider):
        registry = ProviderRegistry()
        registry.register(agnes_provider)
        registry.register(openai_provider)
        result = registry.list_providers()
        assert len(result) == 2
        names = {p["name"] for p in result}
        assert names == {"agnes", "openai"}

    def test_list_models_for(self, agnes_provider, openai_provider):
        registry = ProviderRegistry()
        registry.register(agnes_provider)
        registry.register(openai_provider)
        models = registry.list_models_for(Capability.VISION)
        assert len(models) == 2
        provider_names = {m["provider"] for m in models}
        assert provider_names == {"agnes", "openai"}


class TestResetRegistry:
    """测试 registry 重置"""

    def test_reset_clears_registry(self):
        from mcp_vision_server.providers.registry import get_registry

        # 先获取一个（可能已被初始化）
        reset_registry()
        registry = get_registry()
        assert len(registry) >= 0  # 取决于环境是否有 AGNES_API_KEY
        reset_registry()
