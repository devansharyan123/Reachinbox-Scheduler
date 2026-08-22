import { Router } from "express";
import { prisma } from "../config/database";

const router = Router();

router.get("/emails", async (req, res) => {
  try {
    const senderId = String(req.query.senderId ?? "");
    const status = String(req.query.status ?? "");

    if (!senderId) {
      return res.status(400).json({
        error: "senderId is required",
      });
    }

    const emails = await prisma.email.findMany({
      where: {
        senderId,
        ...(status
          ? {
              status: status as
                | "SCHEDULED"
                | "PROCESSING"
                | "SENT"
                | "FAILED",
            }
          : {}),
      },
      orderBy: {
        scheduledAt: "asc",
      },
      select: {
        id: true,
        recipient: true,
        subject: true,
        body: true,
        scheduledAt: true,
        sentAt: true,
        failedAt: true,
        lastError: true,
        status: true,
      },
    });

    return res.json({
      emails,
      count: emails.length,
    });
  } catch (error) {
    console.error("Dashboard email fetch error:", error);

    return res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch emails",
    });
  }
});

export default router;