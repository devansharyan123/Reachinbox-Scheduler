import { Router } from "express";
import multer from "multer";
import { extractEmails } from "../utils/email.parser";
import { scheduleEmails } from "../services/email.schedule.service";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 10,
    fileSize: 5 * 1024 * 1024,
  },
});

router.post(
  "/schedule",
  upload.array("files", 10),
  async (req, res) => {
    try {
      const files =
        (req.files as Express.Multer.File[]) ?? [];

      const {
        senderId,
        subject,
        body,
        startTime,
        delaySeconds,
        hourlyLimit,
      } = req.body;

      if (!senderId) {
        return res.status(400).json({
          error: "senderId is required",
        });
      }

      if (!subject || !body) {
        return res.status(400).json({
          error: "subject and body are required",
        });
      }

      if (!startTime) {
        return res.status(400).json({
          error: "startTime is required",
        });
      }

      const parsed = extractEmails(files);

      if (parsed.emails.length === 0) {
        return res.status(400).json({
          error: "0 valid emails detected",
          detectedCount: parsed.detectedCount,
          duplicateCount: parsed.duplicateCount,
        });
      }

      const result = await scheduleEmails({
        senderId,
        subject,
        body,
        startTime,
        delaySeconds: Number(delaySeconds),
        hourlyLimit: Number(hourlyLimit),
        emails: parsed.emails,
      });

      return res.status(201).json({
        message: "Emails scheduled successfully",
        detectedCount: parsed.detectedCount,
        scheduledCount: result.scheduledCount,
        duplicateCount: parsed.duplicateCount,
        firstScheduledAt: result.firstScheduledAt,
        lastScheduledAt: result.lastScheduledAt,
      });
    } catch (error) {
      console.error("Scheduling error:", error);

      return res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Failed to schedule emails",
      });
    }
  }
);

export default router;