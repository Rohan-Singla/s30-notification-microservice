import { Worker } from "bullmq";
import "dotenv/config";
import { Resend } from "resend";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import type { NotificationPayload } from "../src/microservices/notificationcontroller";

const resend = new Resend(process.env.RESEND_API_KEY);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const connection = {
  host: "localhost",
  port: 6379,
};

const TEMPLATE_DIR = path.join(__dirname, "../../notification-service/template");

function renderTemplate(html: string, variables: Record<string, string | number>) {
  let result = html;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replaceAll(`{{${key}}}`, String(value));
  }
  return result;
}

function getTemplateVariables(payload: NotificationPayload): Record<string, string | number> {
  switch (payload.template) {
    case "signup-success":
      return { username: payload.email };
    case "marketing-email":
      return {
        username: payload.email,
        title: payload.subject ?? "Marketing Update",
        message: payload.message ?? "",
      };
    case "wallet-onramp-success":
      return {
        username: payload.email,
        amount: payload.amount ?? 0,
      };
    default:
      return { username: payload.email };
  }
}

function getEmailSubject(payload: NotificationPayload) {
  switch (payload.template) {
    case "signup-success":
      return "Welcome!";
    case "marketing-email":
      return payload.subject ?? "Marketing Update";
    case "wallet-onramp-success":
      return "Wallet Updated";
    default:
      return "Notification";
  }
}

async function processEmailJob(payload: NotificationPayload) {
  const templatePath = path.join(TEMPLATE_DIR, `${payload.template}.html`);
  const html = await fs.readFile(templatePath, "utf-8");
  const finalHtml = renderTemplate(html, getTemplateVariables(payload));

  const { data, error } = await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "Acme <onboarding@resend.dev>",
    // can't send email to other recipients in resend without verified domain
    to: ["rohansinglawork@gmail.com"],
    subject: getEmailSubject(payload),
    html: finalHtml,
  });

  if (error) {
    console.error("Resend error:", error);
    throw new Error("Failed to send email");
  }

  console.log(`Email sent (${payload.template}):`, data?.id);
  return true;
}

const workerOptions = { connection };

const emailWorker = new Worker(
  "emails",
  async (job) => {
    console.log("Processing welcome email job:", job.id);
    return processEmailJob(job.data.payload);
  },
  workerOptions,
);

const marketingWorker = new Worker(
  "marketing-emails",
  async (job) => {
    console.log("Processing marketing email job:", job.id);
    return processEmailJob(job.data.payload);
  },
  workerOptions,
);

const walletWorker = new Worker(
  "wallet-emails",
  async (job) => {
    console.log("Processing wallet email job:", job.id);
    return processEmailJob(job.data.payload);
  },
  workerOptions,
);

for (const worker of [emailWorker, marketingWorker, walletWorker]) {
  worker.on("failed", (job, error) => {
    console.error(`Job ${job?.id} failed:`, error.message);
  });
}

console.log("Email workers started: emails, marketing-emails, wallet-emails");
