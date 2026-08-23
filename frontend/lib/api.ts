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


// Dashboard

export interface DashboardEmail {
  id: string;
  recipient: string;
  subject: string;
  body: string;
  scheduledAt: string;
  sentAt: string | null;
  failedAt: string | null;
  lastError: string | null;
  status:
    | "SCHEDULED"
    | "PROCESSING"
    | "SENT"
    | "FAILED";
}

export const getDashboardEmails = async (
  senderId: string,
  status?: string
): Promise<DashboardEmail[]> => {
  const params = new URLSearchParams({
    senderId,
  });

  if (status) {
    params.append("status", status);
  }

  const response = await fetch(
    `${API_URL}/api/dashboard/emails?${params.toString()}`,
    {
      cache: "no-store",
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error ?? "Failed to fetch dashboard emails"
    );
  }

  return data.emails;
};


export interface CurrentUser {
  user: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
  };
  senders: {
    id: string;
    email: string;
    name: string | null;
    hourlyLimit: number;
  }[];
}

export const getCurrentUser = async (
  email: string
): Promise<CurrentUser> => {
  const response = await fetch(
    `${API_URL}/api/users/me?email=${encodeURIComponent(email)}`,
    {
      cache: "no-store",
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error ?? "Failed to fetch current user"
    );
  }

  return data;
};

export interface Sender {
  id: string;
  email: string;
  name: string | null;
  hourlyLimit: number;
}

export interface AddSenderInput {
  userId: string;
  email: string;
  name?: string;
  hourlyLimit?: number;
}

export const addSender = async (
  input: AddSenderInput
): Promise<Sender> => {
  const response = await fetch(
    `${API_URL}/api/users/senders`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error ?? "Failed to add sender"
    );
  }

  return data.sender;
};

export const deleteSender = async (
  senderId: string,
  userId: string
): Promise<void> => {
  const response = await fetch(
    `${API_URL}/api/users/senders/${encodeURIComponent(
      senderId
    )}?userId=${encodeURIComponent(userId)}`,
    {
      method: "DELETE",
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error ?? "Failed to remove sender"
    );
  }
};