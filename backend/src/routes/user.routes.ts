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


/*
 * Add another sender for an existing user.
 *
 * TEST VERSION:
 * The sender email is stored directly.
 *
 * Later we can replace this with Gmail/Outlook OAuth.
 */
router.post("/senders", async (req, res) => {
  try {
    const {
      userId,
      email,
      name,
      hourlyLimit,
    } = req.body;

    if (!userId || !email) {
      return res.status(400).json({
        error: "userId and email are required",
      });
    }

    const normalizedEmail = String(email)
      .trim()
      .toLowerCase();

    const existingUser =
      await prisma.user.findUnique({
        where: {
          id: String(userId),
        },
      });

    if (!existingUser) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    const existingSender =
      await prisma.sender.findFirst({
        where: {
          userId: existingUser.id,
          email: normalizedEmail,
        },
      });

    if (existingSender) {
      return res.status(409).json({
        error:
          "This sender is already connected to the user",
      });
    }

    const parsedHourlyLimit =
      Number(hourlyLimit ?? env.MAX_EMAILS_PER_HOUR);

    if (
      !Number.isInteger(parsedHourlyLimit) ||
      parsedHourlyLimit <= 0
    ) {
      return res.status(400).json({
        error:
          "hourlyLimit must be a positive integer",
      });
    }

    const sender = await prisma.sender.create({
      data: {
        email: normalizedEmail,
        name:
          name?.toString().trim() ||
          `${existingUser.name} Sender`,
        hourlyLimit: parsedHourlyLimit,
        userId: existingUser.id,
      },
    });

    return res.status(201).json({
      message: "Sender added successfully",
      sender: {
        id: sender.id,
        email: sender.email,
        name: sender.name,
        hourlyLimit: sender.hourlyLimit,
      },
    });
  } catch (error) {
    console.error("Add sender error:", error);

    return res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "Failed to add sender",
    });
  }
});


/*
 * Remove a sender.
 */
router.delete("/senders/:senderId", async (req, res) => {
  try {
    const senderId = String(
      req.params.senderId ?? ""
    );

    const userId = String(
      req.query.userId ?? ""
    );

    if (!senderId || !userId) {
      return res.status(400).json({
        error:
          "senderId and userId are required",
      });
    }

    const sender =
      await prisma.sender.findFirst({
        where: {
          id: senderId,
          userId,
        },
      });

    if (!sender) {
      return res.status(404).json({
        error: "Sender not found",
      });
    }

    /*
     * Don't allow deleting the only sender.
     * Every user should have at least one
     * sender available.
     */
    const senderCount =
      await prisma.sender.count({
        where: {
          userId,
        },
      });

    if (senderCount <= 1) {
      return res.status(400).json({
        error:
          "You must keep at least one sender",
      });
    }

    await prisma.sender.delete({
      where: {
        id: senderId,
      },
    });

    return res.json({
      message: "Sender removed successfully",
    });
  } catch (error) {
    console.error("Delete sender error:", error);

    return res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "Failed to remove sender",
    });
  }
});


export default router;