import type { Response } from "express";
import { z } from "zod";
import type { AuthRequest } from "../middleware/auth";
import { send_notification } from "../microservices/notificationcontroller";
import { prisma } from "../../db";

const marketingEmailSchema = z.object({
  subject: z.string().min(1),
  message: z.string().min(1),
});

let notificationId = 1;

export async function marketingEmail(req: AuthRequest, res: Response) {
  try {
    const body = marketingEmailSchema.parse(req.body);

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
      },
    });

    notificationId++;

    for (const user of users) {
      await send_notification(
        notificationId,
        user.id,
        user.email,
        "marketing-email",
        2,
        { subject: body.subject, message: body.message },
      );
    }

    res.status(201).json({
      message: "Marketing email notification created",
      subject: body.subject,
      notification: notificationId,
      recipients: users.length,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: "Validation failed", errors: error.flatten().fieldErrors });
      return;
    }

    res.status(500).json({ message: "Marketing email failed" });
  }
}
