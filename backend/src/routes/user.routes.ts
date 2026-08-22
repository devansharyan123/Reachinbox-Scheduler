import { Router } from "express";
import { prisma } from "../config/database";

const router = Router();

router.get("/me", async (req, res) => {
  try {
    const email = String(req.query.email ?? "").trim().toLowerCase();

    if (!email) {
      return res.status(400).json({
        error: "email is required",
      });
    }

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
      include: {
        senders: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    return res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
      },
      senders: user.senders.map((sender) => ({
        id: sender.id,
        email: sender.email,
        name: sender.name,
        hourlyLimit: sender.hourlyLimit,
      })),
    });
  } catch (error) {
    console.error("User lookup error:", error);

    return res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch user",
    });
  }
});

export default router;