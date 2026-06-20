import { buildApp } from "./app.js";
import { getEnv } from "./env.js";
import { startPingWorker } from "./modules/servers/servers.worker.js";

async function main() {
  const env = getEnv();
  const app = await buildApp();

  try {
    await app.listen({ port: env.PORT, host: env.HOST });
    console.log(`🚀 MCP Hub API running at http://${env.HOST}:${env.PORT}`);

    // 启动 MCP Server 健康检查 Worker
    const worker = startPingWorker();
    console.log(`🩺 Health check worker started (queue: mcp-ping)`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
