const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:5000";

export interface ScheduleEmailInput {
  senderId: string;
  subject: string;
  body: string;
  startTime: string;
  delaySeconds: number;
  hourlyLimit: number;
  files: File[];
}

export interface ScheduleEmailResponse {
  message: string;
  detectedCount: number;
  scheduledCount: number;
  duplicateCount: number;
  firstScheduledAt: string;
  lastScheduledAt: string;
}

export const scheduleEmails = async (
  input: ScheduleEmailInput
): Promise<ScheduleEmailResponse> => {
  const formData = new FormData();

  formData.append("senderId", input.senderId);
  formData.append("subject", input.subject);
  formData.append("body", input.body);
  formData.append("startTime", input.startTime);
  formData.append(
    "delaySeconds",
    String(input.delaySeconds)
  );
  formData.append(
    "hourlyLimit",
    String(input.hourlyLimit)
  );

  for (const file of input.files) {
    formData.append("files", file);
  }

  const response = await fetch(
    `${API_URL}/api/emails/schedule`,
    {
      method: "POST",
      body: formData,
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error ?? "Failed to schedule emails"
    );
  }

  return data;
};