import { Worker } from "bullmq";
import "dotenv/config";
import { Resend } from "resend";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const resend = new Resend(process.env.RESEND_API_KEY);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const connection = {
  host: "localhost",
  port: 6379,
};

const worker = new Worker(
  "emails",
  async (job) => {
    console.log("Processing job:", job.id);

    const payload = job.data.payload;

    const templatePath = path.join(
      __dirname,
      `../../notification-service/template/${payload.template}.html`
    );

    const html = await fs.readFile(templatePath, "utf-8");

    const { data, error } = await resend.emails.send({
      from:
        process.env.EMAIL_FROM ??
        "Acme <onboarding@resend.dev>",

      to: [payload.email],

      subject: "Notification",

      html,
    });

    if (error) {
      console.error("Resend error:", error);
      throw new Error("Failed to send email");
    }

    console.log("Email sent:", data?.id);

    return true;
  },
  { connection }
);