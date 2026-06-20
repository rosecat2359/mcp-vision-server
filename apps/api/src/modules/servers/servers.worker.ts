import { Queue, Worker } from "bullmq";
import { getEnv } from "../../env.js";
import { pingServer, updateServerStatus } from "./servers.service.js";

let pingQueue: Queue | null = null;
let pingWorker: Worker | null = null;

export function getPingQueue(): Queue {
  if (!pingQueue) {
    const env = getEnv();
    pingQueue = new Queue("mcp-ping", {
      connection: { url: env.REDIS_URL },
    });
  }
  return pingQueue;
}

export function startPingWorker(): Worker {
  const env = getEnv();

  // Initialize queue first
  const queue = getPingQueue();

  pingWorker = new Worker(
    "mcp-ping",
    async (job) => {
      const { serverId } = job.data;
      const result = await pingServer(serverId);
      await updateServerStatus(serverId, result.status);
      return result;
    },
    {
      connection: { url: env.REDIS_URL },
      autorun: true,
    }
  );

  // 添加定期任务 — 每 60 秒 ping 所有 server
  queue.add(
    "schedule",
    {},
    {
      repeat: { every: 60_000 },
      removeOnComplete: true,
    }
  );

  return pingWorker;
}

export async function enqueuePingJob(serverId: string): Promise<void> {
  const queue = getPingQueue();
  await queue.add("ping", { serverId }, { removeOnComplete: true, removeOnFail: 100 });
}
