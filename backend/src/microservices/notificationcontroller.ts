import { Queue } from "bullmq";

const connection = {
  host: "localhost",
  port: 6379,
};

const PRIORITY_MAP: Record<number, number> = {
  0: 1,
  1: 2,
  2: 3,
};

const QUEUE_BY_TEMPLATE: Record<string, string> = {
  "signup-success": "emails",
  "marketing-email": "marketing-emails",
  "wallet-onramp-success": "wallet-emails",
};

interface NotificationPayload {
  id: number;
  user: number;
  email: string;
  template: string;
  service: "EMAIL";
  priority: number;
  subject?: string;
  message?: string;
  amount?: number;
}

const queues = new Map<string, Queue>();

function getQueue(name: string) {
  let queue = queues.get(name);
  if (!queue) {
    queue = new Queue(name, { connection });
    queues.set(name, queue);
  }
  return queue;
}

async function addToQueue(data: NotificationPayload) {
  const queueName = QUEUE_BY_TEMPLATE[data.template];
  if (!queueName) {
    throw new Error(`Unknown template: ${data.template}`);
  }

  const queue = getQueue(queueName);

  return queue.add(
    "send-email",
    { payload: data },
    {
      priority: PRIORITY_MAP[data.priority],
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
    },
  );
}

async function send_notification(
  notificationId: number,
  userId: number,
  email: string,
  template: string,
  priority: number,
  extras?: Pick<NotificationPayload, "subject" | "message" | "amount">,
) {
  const data: NotificationPayload = {
    id: notificationId,
    email,
    user: userId,
    template,
    service: "EMAIL",
    priority,
    ...extras,
  };

  const notification = await addToQueue(data);

  return {
    id: notification.id,
    user: email,
    template,
    service: "EMAIL" as const,
    priority,
  };
}

export { addToQueue, send_notification };
export type { NotificationPayload };
