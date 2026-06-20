import { buildApp } from "./app.js";
import { getEnv } from "./env.js";

async function main() {
  const env = getEnv();
  const app = await buildApp();

  try {
    await app.listen({ port: env.PORT, host: env.HOST });
    console.log(`🚀 MCP Hub API running at http://${env.HOST}:${env.PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
