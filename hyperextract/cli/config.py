"""Configuration management for Hyper-Extract CLI."""

import os
import json
import tomllib
import tomli_w
from pathlib import Path
from typing import Optional, Dict, Any
from dataclasses import dataclass


DEFAULT_CONFIG_DIR = Path.home() / ".he"
DEFAULT_CONFIG_FILE = DEFAULT_CONFIG_DIR / "config.toml"

# Provider presets: base_url and default models for each provider
PROVIDER_PRESETS: Dict[str, Dict[str, str | None]] = {
    "openai": {
        "base_url": "https://api.openai.com/v1",
        "default_llm": "gpt-4o-mini",
        "default_embedder": "text-embedding-3-small",
        "default_agent": "gpt-4o-mini",
    },
    "bailian": {
        "base_url": "https://dashscope.aliyuncs.com/compatible-mode/v1",
        "default_llm": "qwen3.6-plus",
        "default_embedder": "text-embedding-v4",
        "default_agent": "qwen3.6-plus",
    },
    "vllm": {
        "base_url": None,
        "default_llm": None,
        "default_embedder": None,
        "default_agent": None,
    },
    "openrouter": {
        "base_url": "https://openrouter.ai/api/v1",
        "default_llm": "meta-llama/llama-3-8b-instruct:free",
        "default_embedder": None,
        "default_agent": "meta-llama/llama-3-8b-instruct:free",
    },
    "nvidia": {
        "base_url": "https://integrate.api.nvidia.com/v1",
        "default_llm": "meta/llama-3.1-8b-instruct",
        "default_embedder": "nvidia/embeddings-nv-embed-qa-4",
        "default_agent": "meta/llama-3.1-8b-instruct",
    },
    "ollama": {
        "base_url": "http://localhost:11434/v1",
        "default_llm": "llama3",
        "default_embedder": "nomic-embed-text",
        "default_agent": "llama3",
    },
    "lmstudio": {
        "base_url": "http://localhost:1234/v1",
        "default_llm": None,
        "default_embedder": None,
        "default_agent": None,
    },
}


@dataclass
class LLMConfig:
    provider: str = ""
    model: str = "gpt-4o-mini"
    api_key: str = ""
    base_url: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "provider": self.provider,
            "model": self.model,
            "api_key": self.api_key,
            "base_url": self.base_url,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "LLMConfig":
        return cls(
            provider=data.get("provider", ""),
            model=data.get("model", "gpt-4o-mini"),
            api_key=data.get("api_key", ""),
            base_url=data.get("base_url", ""),
        )


@dataclass
class EmbedderConfig:
    provider: str = ""
    model: str = "text-embedding-3-small"
    api_key: str = ""
    base_url: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "provider": self.provider,
            "model": self.model,
            "api_key": self.api_key,
            "base_url": self.base_url,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "EmbedderConfig":
        return cls(
            provider=data.get("provider", ""),
            model=data.get("model", "text-embedding-3-small"),
            api_key=data.get("api_key", ""),
            base_url=data.get("base_url", ""),
        )


@dataclass
class AgentConfig:
    provider: str = ""
    model: str = "meta-llama/llama-3-8b-instruct:free"
    api_key: str = ""
    base_url: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "provider": self.provider,
            "model": self.model,
            "api_key": self.api_key,
            "base_url": self.base_url,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "AgentConfig":
        return cls(
            provider=data.get("provider", ""),
            model=data.get("model", "meta-llama/llama-3-8b-instruct:free"),
            api_key=data.get("api_key", ""),
            base_url=data.get("base_url", ""),
        )


class ConfigManager:
    """Manages Hyper-Extract CLI configuration."""

    def __init__(self, config_path: Optional[Path] = None):
        self.config_path = config_path or DEFAULT_CONFIG_FILE
        self.llm = LLMConfig()
        self.embedder = EmbedderConfig()
        self.agent = AgentConfig()
        self._load()

    def _load(self) -> None:
        """Load configuration from file."""
        if not self.config_path.exists():
            return

        with open(self.config_path, "rb") as f:
            data = tomllib.load(f)

        if "llm" in data:
            self.llm = LLMConfig.from_dict(data["llm"])
        if "embedder" in data:
            self.embedder = EmbedderConfig.from_dict(data["embedder"])
        if "agent" in data:
            self.agent = AgentConfig.from_dict(data["agent"])

    def _save(self) -> None:
        """Save configuration to file."""
        DEFAULT_CONFIG_DIR.mkdir(parents=True, exist_ok=True)

        data = {
            "llm": self.llm.to_dict(),
            "embedder": self.embedder.to_dict(),
            "agent": self.agent.to_dict(),
        }

        with open(self.config_path, "wb") as f:
            tomli_w.dump(data, f)

    def _resolve_base_url(self, provider: str, explicit_base_url: str) -> str:
        """Resolve base_url from provider preset. Explicit value takes precedence."""
        if explicit_base_url:
            return explicit_base_url
        if provider in PROVIDER_PRESETS:
            preset_url = PROVIDER_PRESETS[provider].get("base_url")
            if preset_url is None:
                raise ValueError(
                    f"Provider '{provider}' requires explicit base_url. "
                    f"Please set it via config or environment variable."
                )
            return preset_url
        return ""

    def get_llm_config(self) -> LLMConfig:
        """Get LLM config with environment variable fallback."""
        provider = self.llm.provider
        api_key = self.llm.api_key or os.environ.get("OPENAI_API_KEY", "")
        if not api_key and provider in {"vllm", "ollama", "lmstudio"}:
            api_key = "local"
        config = LLMConfig(
            provider=provider,
            model=self.llm.model,
            api_key=api_key,
            base_url=self._resolve_base_url(
                provider,
                self.llm.base_url or os.environ.get("OPENAI_BASE_URL", ""),
            ),
        )
        return config

    def get_embedder_config(self) -> EmbedderConfig:
        """Get Embedder config with environment variable fallback."""
        provider = self.embedder.provider
        api_key = self.embedder.api_key or os.environ.get("OPENAI_API_KEY", "")
        if not api_key and provider in {"vllm", "ollama", "lmstudio"}:
            api_key = "local"
        config = EmbedderConfig(
            provider=provider,
            model=self.embedder.model,
            api_key=api_key,
            base_url=self._resolve_base_url(
                provider,
                self.embedder.base_url or os.environ.get("OPENAI_BASE_URL", ""),
            ),
        )
        return config

    def get_agent_config(self) -> AgentConfig:
        """Get Agent config with environment variable fallback."""
        provider = self.agent.provider
        api_key = self.agent.api_key or os.environ.get("OPENAI_API_KEY", "")
        if not api_key and provider in {"vllm", "ollama", "lmstudio"}:
            api_key = "local"
        config = AgentConfig(
            provider=provider,
            model=self.agent.model,
            api_key=api_key,
            base_url=self._resolve_base_url(
                provider,
                self.agent.base_url or os.environ.get("OPENAI_BASE_URL", ""),
            ),
        )
        return config

    def set_llm(
        self,
        provider: Optional[str] = None,
        model: Optional[str] = None,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
    ) -> None:
        """Set LLM configuration."""
        if provider is not None:
            old_provider = self.llm.provider
            self.llm.provider = provider
            if provider != old_provider:
                preset = PROVIDER_PRESETS.get(provider, {})
                self.llm.model = preset.get("default_llm") or ""
                self.llm.base_url = preset.get("base_url") or ""
        if model:
            self.llm.model = model
        if api_key is not None:
            self.llm.api_key = api_key
        if base_url is not None:
            self.llm.base_url = base_url
        self._save()

    def set_embedder(
        self,
        provider: Optional[str] = None,
        model: Optional[str] = None,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
    ) -> None:
        """Set Embedder configuration."""
        if provider is not None:
            old_provider = self.embedder.provider
            self.embedder.provider = provider
            if provider != old_provider:
                preset = PROVIDER_PRESETS.get(provider, {})
                self.embedder.model = preset.get("default_embedder") or ""
                self.embedder.base_url = preset.get("base_url") or ""
        if model:
            self.embedder.model = model
        if api_key is not None:
            self.embedder.api_key = api_key
        if base_url is not None:
            self.embedder.base_url = base_url
        self._save()

    def set_agent(
        self,
        provider: Optional[str] = None,
        model: Optional[str] = None,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
    ) -> None:
        """Set Agent configuration."""
        if provider is not None:
            old_provider = self.agent.provider
            self.agent.provider = provider
            if provider != old_provider:
                preset = PROVIDER_PRESETS.get(provider, {})
                self.agent.model = preset.get("default_agent") or ""
                self.agent.base_url = preset.get("base_url") or ""
        if model:
            self.agent.model = model
        if api_key is not None:
            self.agent.api_key = api_key
        if base_url is not None:
            self.agent.base_url = base_url
        self._save()

    def unset_llm(self) -> None:
        """Unset LLM configuration."""
        self.llm = LLMConfig()
        self._save()

    def unset_embedder(self) -> None:
        """Unset Embedder configuration."""
        self.embedder = EmbedderConfig()
        self._save()

    def unset_agent(self) -> None:
        """Unset Agent configuration."""
        self.agent = AgentConfig()
        self._save()

    def show(self) -> Dict[str, Any]:
        """Show current configuration."""
        return {
            "llm": self.get_llm_config().to_dict(),
            "embedder": self.get_embedder_config().to_dict(),
            "agent": self.get_agent_config().to_dict(),
        }

    def validate(self) -> tuple[bool, str]:
        """Validate configuration."""
        llm_config = self.get_llm_config()
        embedder_config = self.get_embedder_config()

        local_providers = {"vllm", "ollama", "lmstudio"}

        if llm_config.provider in local_providers:
            if not llm_config.base_url:
                return False, f"{llm_config.provider} provider requires base_url."
        elif not llm_config.api_key:
            return (
                False,
                "LLM API key is not configured. Run 'he config llm --api-key YOUR_KEY'",
            )

        if embedder_config.provider in local_providers:
            if not embedder_config.base_url:
                return False, f"{embedder_config.provider} embedder requires base_url."
        elif not embedder_config.api_key:
            return (
                False,
                "Embedder API key is not configured. Run 'he config embedder --api-key YOUR_KEY'",
            )

        agent_config = self.get_agent_config()
        if agent_config.provider:
            if agent_config.provider in local_providers:
                if not agent_config.base_url:
                    return False, f"{agent_config.provider} agent requires base_url."
            elif not agent_config.api_key:
                return (
                    False,
                    "Agent API key is not configured. Run 'he config agent --api-key YOUR_KEY'",
                )

        return True, "Configuration is valid"


def load_ka_metadata(ka_path: Path) -> Optional[Dict[str, Any]]:
    """Load knowledge abstract metadata from directory."""
    metadata_path = ka_path / "metadata.json"
    if not metadata_path.exists():
        return None

    with open(metadata_path, "r", encoding="utf-8") as f:
        return json.load(f)
