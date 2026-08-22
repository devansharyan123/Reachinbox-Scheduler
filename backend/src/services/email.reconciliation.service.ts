import { prisma } from "../config/database";

const STALE_PROCESSING_MINUTES = 5;

export const reconcileStaleProcessingEmails = async () => {
  const cutoff = new Date(
    Date.now() - STALE_PROCESSING_MINUTES * 60 * 1000
  );

  const result = await prisma.email.updateMany({
    where: {
      status: "PROCESSING",
      updatedAt: {
        lt: cutoff,
      },
    },
    data: {
      status: "FAILED",
      failedAt: new Date(),
      lastError: "unconfirmed after crash",
    },
  });

  if (result.count > 0) {
    console.log(
      `Reconciled ${result.count} stale PROCESSING email(s).`
    );
  }
};