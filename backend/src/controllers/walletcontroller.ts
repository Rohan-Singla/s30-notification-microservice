import type { Response } from "express";
import { z } from "zod";
import { prisma } from "../../db";
import type { AuthRequest } from "../middleware/auth";
import { send_notification } from "../microservices/notificationcontroller";

const walletOnrampSchema = z.object({
  amount: z.coerce.number().positive(),
});

let notificationId = 1;

export async function walletOnramp(req: AuthRequest, res: Response) {
  try {
    notificationId++;
    const body = walletOnrampSchema.parse(req.body);

    if (!req.user) {
      res.status(401).json({ message: "Login required" });
      return;
    }

    const wallet = await prisma.wallet.upsert({
      where: { userId: req.user.id },
      update: {
        balance: {
          increment: body.amount,
        },
      },
      create: {
        userId: req.user.id,
        balance: body.amount,
      },
    });

    await send_notification(
      notificationId,
      req.user.id,
      req.user.email,
      "wallet-onramp-success",
      0,
      { amount: body.amount },
    );

    res.status(201).json({
      message: "Wallet onramp successful",
      amount: body.amount,
      notification: notificationId,
      balance: wallet.balance,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: "Validation failed", errors: error.flatten().fieldErrors });
      return;
    }

    res.status(500).json({ message: "Wallet onramp failed" });
  }
}
