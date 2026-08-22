import { Router } from "express";
import { prisma } from "../config/database";
import { env } from "../config/env";

const router = Router();

/*
 * Called by NextAuth after successful Google login.
 *
 * Creates the User automatically if it does not exist.
 * Also creates an Ethereal Sender for the user if needed.
 */
router.post("/sync", async (req, res) => {
  try {
    const secret = req.headers["x-internal-secret"];

    if (
      !env.INTERNAL_API_SECRET ||
      secret !== env.INTERNAL_API_SECRET
    ) {
      return res.status(401).json({
        error: "Unauthorized",
      });
    }

    const {
      googleId,
      name,
      email,
      avatar,
    } = req.body;

    if (!googleId || !email) {
      return res.status(400).json({
        error: "googleId and email are required",
      });
    }

    const normalizedEmail = String(email)
      .trim()
      .toLowerCase();

    const user = await prisma.user.upsert({
      where: {
        email: normalizedEmail,
      },
      update: {
        googleId: String(googleId),
        name: String(name ?? "User"),
        avatar: avatar ?? null,
      },
      create: {
        googleId: String(googleId),
        name: String(name ?? "User"),
        email: normalizedEmail,
        avatar: avatar ?? null,
      },
    });

    let sender = await prisma.sender.findFirst({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    if (!sender) {
      sender = await prisma.sender.create({
        data: {
          email: env.SMTP_USER,
          name: `${user.name} Sender`,
          hourlyLimit: env.MAX_EMAILS_PER_HOUR,
          userId: user.id,
        },
      });
    }

    return res.json({
      message: "User synchronized successfully",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
      },
      sender: {
        id: sender.id,
        email: sender.email,
        name: sender.name,
        hourlyLimit: sender.hourlyLimit,
      },
    });
  } catch (error) {
    console.error("User sync error:", error);

    return res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "Failed to synchronize user",
    });
  }
});


/*
 * Get the currently stored user and their senders.
 */
router.get("/me", async (req, res) => {
  try {
    const email = String(req.query.email ?? "")
      .trim()
      .toLowerCase();

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