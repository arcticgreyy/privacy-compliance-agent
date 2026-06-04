import type { CloudTasksClient as CloudTasksClientType } from "@google-cloud/tasks";

let client: CloudTasksClientType | null = null;

async function getClient(): Promise<CloudTasksClientType> {
  if (!client) {
    const { CloudTasksClient } = await import("@google-cloud/tasks");
    client = new CloudTasksClient();
  }
  return client;
}

function isConfigured(): boolean {
  return !!(
    process.env.GCP_PROJECT_ID &&
    process.env.GCP_REGION &&
    process.env.CLOUD_TASKS_QUEUE &&
    process.env.WORKER_SERVICE_URL
  );
}

async function getQueuePath(): Promise<string> {
  const c = await getClient();
  return c.queuePath(
    process.env.GCP_PROJECT_ID!,
    process.env.GCP_REGION!,
    process.env.CLOUD_TASKS_QUEUE!
  );
}

export interface DispatchResult {
  dispatched: boolean;
  taskName?: string;
  method: "cloud-tasks" | "direct" | "queued-only";
}

export async function dispatchScanTask(
  scanId: string
): Promise<DispatchResult> {
  if (!isConfigured()) {
    return { dispatched: false, method: "queued-only" };
  }

  const workerUrl = `${process.env.WORKER_SERVICE_URL}/api/worker/run-scan`;
  const body = JSON.stringify({ scanId });

  const tasksClient = await getClient();
  const queuePath = await getQueuePath();

  const [response] = await tasksClient.createTask({
    parent: queuePath,
    task: {
      httpRequest: {
        httpMethod: "POST",
        url: workerUrl,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.CRON_SECRET}`,
        },
        body: Buffer.from(body).toString("base64"),
      },
    },
  });

  return {
    dispatched: true,
    taskName: response.name ?? undefined,
    method: "cloud-tasks",
  };
}

export async function dispatchScanTaskDirect(
  scanId: string
): Promise<DispatchResult> {
  const workerUrl = process.env.WORKER_SERVICE_URL;
  if (!workerUrl) {
    return { dispatched: false, method: "queued-only" };
  }

  const res = await fetch(`${workerUrl}/api/worker/run-scan`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.CRON_SECRET}`,
    },
    body: JSON.stringify({ scanId }),
  });

  if (!res.ok) {
    throw new Error(`Worker responded with ${res.status}: ${await res.text()}`);
  }

  return { dispatched: true, method: "direct" };
}

export async function dispatchScan(scanId: string): Promise<DispatchResult> {
  // Prefer Cloud Tasks (durable queue with retries) over direct HTTP
  if (isConfigured()) {
    return dispatchScanTask(scanId);
  }

  // Fall back to direct worker call if WORKER_SERVICE_URL is set but Cloud Tasks isn't
  if (process.env.WORKER_SERVICE_URL) {
    return dispatchScanTaskDirect(scanId);
  }

  // No dispatch target configured — scan stays in PENDING
  return { dispatched: false, method: "queued-only" };
}
