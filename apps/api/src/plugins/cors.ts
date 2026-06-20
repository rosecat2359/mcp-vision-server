import corsPlugin from "@fastify/cors";
import type { FastifyInstance } from "fastify";
import { getEnv } from "../env.js";

export async function corsSetup(app: FastifyInstance) {
  const env = getEnv();
  await app.register(corsPlugin, {
    origin: env.CORS_ORIGIN.split(",").map((s) => s.trim()),
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });
}
