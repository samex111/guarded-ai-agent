/**
 * BullMQ worker — purge expired TEMPORARY leads on a schedule.
 */

import { Queue, Worker } from "bullmq";
import { createBullMQConnection } from "../db/redis.js";
import { purgeExpiredTemporaryLeads } from "../leads/service.js";

const QUEUE_NAME = "lead-cleanup";
const REPEAT_JOB_ID = "lead-cleanup-repeat";

let _worker: Worker | undefined;
let _queue: Queue | undefined;

export async function startLeadCleanupScheduler(): Promise<void> {
  if (_worker !== undefined) {
    return;
  }

  try {
    const connection = createBullMQConnection("lead-cleanup");

    _queue = new Queue(QUEUE_NAME, {
      connection,
      /** Dev-friendly: some local Redis builds report version below 5; use Redis 6+ in production. */
      skipVersionCheck: true,
    });

    await _queue.add(
      "purge-expired-temporaries",
      {},
      {
        jobId: REPEAT_JOB_ID,
        repeat: { every: 60 * 60 * 1000 },
        removeOnComplete: true,
        removeOnFail: 10,
      },
    );

    _worker = new Worker(
      QUEUE_NAME,
      async () => {
        const purged = await purgeExpiredTemporaryLeads();
        if (purged > 0) {
          console.log(`🧹 Lead cleanup: removed ${purged} expired temporary lead(s)`);
        }
      },
      { connection, skipVersionCheck: true },
    );

    _worker.on("failed", (job, err) => {
      console.error(`❌ Lead cleanup job ${job?.id} failed:`, err);
    });

    console.log("🧹 Lead cleanup BullMQ worker + hourly repeat job started");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(
      "⚠️  Lead cleanup queue disabled (BullMQ needs Redis ≥ 5). Expired TEMPORARY leads will not auto-purge until Redis is upgraded or cleanup is run manually.",
    );
    console.warn(`   Reason: ${msg}`);

    try {
      await _worker?.close();
    } catch {
      /* ignore */
    }
    try {
      await _queue?.close();
    } catch {
      /* ignore */
    }
    _worker = undefined;
    _queue = undefined;
  }
}

export async function stopLeadCleanupScheduler(): Promise<void> {
  await _worker?.close();
  await _queue?.close();
  _worker = undefined;
  _queue = undefined;
}
