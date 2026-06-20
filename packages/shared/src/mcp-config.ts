import type { McpServerDTO } from "./api-types.js";

export interface ClaudeDesktopConfig {
  mcpServers: Record<string, {
    transport: { type: string; url: string; headers?: Record<string, string> };
  }>;
}

export function generateClaudeConfig(
  server: McpServerDTO,
  apiKey?: string
): ClaudeDesktopConfig {
  const transport: { type: string; url: string; headers?: Record<string, string> } = {
    type: server.transport,
    url: server.endpoint,
  };

  if (server.authType === "bearer" && apiKey) {
    transport.headers = { Authorization: `Bearer ${apiKey}` };
  }

  return {
    mcpServers: {
      [server.name]: { transport },
    },
  };
}

export function configToYaml(config: ClaudeDesktopConfig): string {
  let yaml = "mcpServers:\n";
  for (const [name, entry] of Object.entries(config.mcpServers)) {
    yaml += `  ${name}:\n`;
    yaml += `    transport:\n`;
    yaml += `      type: ${entry.transport.type}\n`;
    yaml += `      url: ${entry.transport.url}\n`;
    if (entry.transport.headers) {
      yaml += `      headers:\n`;
      for (const [key, value] of Object.entries(entry.transport.headers)) {
        yaml += `        ${key}: ${value}\n`;
      }
    }
  }
  return yaml;
}
