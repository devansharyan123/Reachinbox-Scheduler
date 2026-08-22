"use client";

import { useRef, useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  scheduleEmails,
  getCurrentUser,
} from "@/lib/api";

const EMAIL_REGEX =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Sender {
  id: string;
  email: string;
  name: string | null;
  hourlyLimit: number;
}

export default function ComposePage() {
  const router = useRouter();

  const {
    data: session,
    status: sessionStatus,
  } = useSession();

  const fileInputRef =
    useRef<HTMLInputElement>(null);

  const [sender, setSender] =
    useState<Sender | null>(null);

  const [files, setFiles] =
    useState<File[]>([]);

  const [recipients, setRecipients] =
    useState<string[]>([]);

  const [recipientInput, setRecipientInput] =
    useState("");

  const [subject, setSubject] =
    useState("");

  const [body, setBody] =
    useState("");

  const [delaySeconds, setDelaySeconds] =
    useState("2");

  const [hourlyLimit, setHourlyLimit] =
    useState("200");

  const [startTime, setStartTime] =
    useState("");

  const [isScheduling, setIsScheduling] =
    useState(false);

  const [loadingSender, setLoadingSender] =
    useState(true);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  /*
   * Get the sender belonging to the
   * currently authenticated Google account.
   */
  useEffect(() => {
    if (sessionStatus === "loading") {
      return;
    }

    if (sessionStatus === "unauthenticated") {
      router.push("/");
      return;
    }

    const email = session?.user?.email;

    if (!email) {
      setError(
        "Unable to determine logged-in user."
      );
      setLoadingSender(false);
      return;
    }

    const loadSender = async () => {
      try {
        setLoadingSender(true);
        setError("");

        const data =
          await getCurrentUser(email);

        if (!data.senders.length) {
          throw new Error(
            "No sender is configured for this account."
          );
        }

        const currentSender =
          data.senders[0];

        setSender(currentSender);

        /*
         * Use the sender's configured hourly
         * limit as the default.
         */
        setHourlyLimit(
          String(currentSender.hourlyLimit)
        );
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Failed to load sender."
        );
      } finally {
        setLoadingSender(false);
      }
    };

    loadSender();
  }, [
    session,
    sessionStatus,
    router,
  ]);

  const parseFiles = async (
    selectedFiles: File[]
  ) => {
    const contents =
      await Promise.all(
        selectedFiles.map((file) =>
          file.text()
        )
      );

    const emails = contents
      .join("\n")
      .replace(/^\uFEFF/, "")
      .split(/[\n,;\r]+/)
      .map((value) =>
        value.trim().toLowerCase()
      )
      .filter((value) =>
        EMAIL_REGEX.test(value)
      );

    return Array.from(
      new Set(emails)
    );
  };

  const addRecipient = (value: string) => {
    const emails = value
      .split(/[\s,;]+/)
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);

    const invalidEmail = emails.find(
      (email) => !EMAIL_REGEX.test(email)
    );

    if (invalidEmail) {
      setError(`Invalid email: ${invalidEmail}`);
      return;
    }

    setRecipients((current) =>
      Array.from(
        new Set([...current, ...emails])
      )
    );

    setRecipientInput("");
    setError("");
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFiles =
      Array.from(
        event.target.files ?? []
      );

    if (!selectedFiles.length) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      const emails =
        await parseFiles(selectedFiles);
      setFiles((current) => [
        ...current,
        ...selectedFiles,
      ]);

      setRecipients((current) =>
        Array.from(
          new Set([...current, ...emails])
        )
      );

    } catch {
      setError(
        "Unable to read the selected files."
      );
    }
  };

  const removeRecipient = (
    email: string
  ) => {
    setRecipients((current) =>
      current.filter(
        (item) => item !== email
      )
    );
  };

  const handleSchedule = async () => {
    setError("");
    setSuccess("");

    if (!sender) {
      setError(
        "Sender account is not available yet."
      );
      return;
    }

    if (!recipients.length) {
      setError("Please add at least one recipient email.");
      return;
    }

    if (!subject.trim()) {
      setError(
        "Subject is required."
      );
      return;
    }

    if (!body.trim()) {
      setError(
        "Email body is required."
      );
      return;
    }

    if (!startTime) {
      setError(
        "Please select a start time."
      );
      return;
    }

    setIsScheduling(true);

    try {
      const result = await scheduleEmails({
        senderId: sender.id,
        subject,
        body,
        startTime: new Date(startTime).toISOString(),
        delaySeconds: Number(delaySeconds),
        hourlyLimit: Number(hourlyLimit),

        files: [
          new File(
            [recipients.join("\n")],
            "recipients.txt",
            {
              type: "text/plain",
            }
          ),
        ],
      });

      setSuccess(
        `${result.scheduledCount} emails scheduled successfully.`
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to schedule emails."
      );
    } finally {
      setIsScheduling(false);
    }
  };

  if (sessionStatus === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white text-sm text-[#999]">
        Loading...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white text-[#202124]">
      <div className="flex min-h-screen">

        {/* Sidebar */}
        <aside className="w-[190px] shrink-0 border-r border-[#eeeeee] px-5 py-6">

          <div className="mb-7 text-[27px] font-black tracking-[-2px]">
            ONG
          </div>

          {/* Logged-in user */}
          <div className="mb-3 flex items-center gap-2 px-1 py-2">

            {session?.user?.image ? (
              <img
                src={session.user.image}
                alt=""
                className="h-8 w-8 rounded-full"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#d9b08c] text-[11px] font-semibold">
                {session?.user?.name
                  ?.charAt(0)
                  .toUpperCase() ?? "U"}
              </div>
            )}

            <div className="min-w-0">
              <p className="truncate text-[12px] font-medium">
                {session?.user?.name ??
                  "User"}
              </p>

              <p className="truncate text-[9px] text-[#9a9a9a]">
                {session?.user?.email}
              </p>
            </div>
          </div>

          <button
            className="mb-7 h-[30px] w-full cursor-pointer rounded-full border border-[#16b364] text-[11px] font-medium text-[#0aaf51]"
          >
            Compose
          </button>

          <p className="mb-2 px-2 text-[9px] font-medium uppercase tracking-wide text-[#a0a0a0]">
            Core
          </p>

          <a
            href="/dashboard"
            className="mb-1 flex h-[31px] items-center gap-2 rounded-lg px-2 text-[11px] text-[#555] hover:bg-[#f5f8f6]"
          >
            ◷ Scheduled
          </a>

          <a
            href="/dashboard"
            className="flex h-[31px] items-center gap-2 rounded-lg px-2 text-[11px] text-[#555] hover:bg-[#f5f8f6]"
          >
            ➤ Sent
          </a>

        </aside>

        {/* Main */}
        <section className="flex min-w-0 flex-1 flex-col">

          {/* Header */}
          <header className="flex h-[72px] items-center justify-between border-b border-[#eeeeee] px-7">

            <a
              href="/dashboard"
              className="flex cursor-pointer items-center gap-2 text-[12px] text-[#555]"
            >
              ← Back
            </a>

            <button
              type="button"
              onClick={handleSchedule}
              disabled={
                isScheduling ||
                loadingSender ||
                !sender
              }
              className="cursor-pointer rounded-md bg-[#00b341] px-5 py-2 text-[10px] font-medium text-white hover:bg-[#00a83d] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loadingSender
                ? "Loading..."
                : isScheduling
                  ? "Scheduling..."
                  : "Schedule"}
            </button>

          </header>

          {/* Compose */}
          <div className="mx-auto w-full max-w-[850px] px-10 py-8">

            <h1 className="mb-7 text-[20px] font-semibold">
              Compose New Email
            </h1>

            {/* From */}
            <div className="mb-5">

              <label className="mb-2 block text-[10px] font-medium text-[#777]">
                From
              </label>

              <select
                value={sender?.id ?? ""}
                disabled
                className="h-[38px] w-full cursor-not-allowed rounded-md border border-[#e5e8e6] bg-[#f8faf9] px-3 text-[11px] outline-none"
              >
                {sender ? (
                  <option value={sender.id}>
                    {sender.email}
                  </option>
                ) : (
                  <option value="">
                    Loading sender...
                  </option>
                )}
              </select>

            </div>

            {/* Recipients */}
            <div className="mb-5">

              <div className="mb-2 flex items-center justify-between">

                <label className="text-[10px] font-medium text-[#777]">
                  To
                </label>

                <button
                  type="button"
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                  className="cursor-pointer text-[10px] font-medium text-[#00a943] hover:underline"
                >
                  Upload List
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  multiple
                  hidden
                  onChange={handleFileUpload}
                />

              </div>

              <div className="min-h-[44px] rounded-md border border-[#e5e8e6] p-2">
                <div className="flex flex-wrap items-center gap-1.5">

                  {recipients.map((email) => (
                    <span
                      key={email}
                      className="flex items-center gap-1 rounded-full bg-[#e8f7ef] px-2.5 py-1 text-[9px] text-[#16814a]"
                    >
                      {email}

                      <button
                        type="button"
                        onClick={() =>
                          removeRecipient(email)
                        }
                        className="cursor-pointer text-[#16814a] hover:text-red-500"
                      >
                        ×
                      </button>
                    </span>
                  ))}

                  <input
                    value={recipientInput}
                    onChange={(event) =>
                      setRecipientInput(event.target.value)
                    }
                    onKeyDown={(event) => {
                      if (
                        event.key === "Enter" ||
                        event.key === "," ||
                        event.key === ";"
                      ) {
                        event.preventDefault();

                        if (recipientInput.trim()) {
                          addRecipient(recipientInput);
                        }
                      }
                    }}
                    onBlur={() => {
                      if (recipientInput.trim()) {
                        addRecipient(recipientInput);
                      }
                    }}
                    placeholder={
                      recipients.length === 0
                        ? "Enter recipient email"
                        : "Add another email..."
                    }
                    className="min-w-[180px] flex-1 bg-transparent px-1 py-1 text-[10px] outline-none placeholder:text-[#aaa]"
                  />

                </div>
              </div>

              {files.length > 0 && (
                <p className="mt-2 text-[9px] text-[#888]">
                  {files.length} file
                  {files.length === 1
                    ? ""
                    : "s"}{" "}
                  ·{" "}
                  {recipients.length} valid
                  email
                  {recipients.length === 1
                    ? ""
                    : "s"}{" "}
                  detected
                </p>
              )}

            </div>

            {/* Subject */}
            <div className="mb-5">

              <label className="mb-2 block text-[10px] font-medium text-[#777]">
                Subject
              </label>

              <input
                value={subject}
                onChange={(event) =>
                  setSubject(
                    event.target.value
                  )
                }
                placeholder="Enter email subject"
                className="h-[38px] w-full rounded-md border border-[#e5e8e6] px-3 text-[11px] outline-none placeholder:text-[#aaa] focus:border-[#00b341]"
              />

            </div>

            {/* Scheduling */}
            <div className="mb-5 grid grid-cols-3 gap-4">

              <div>

                <label className="mb-2 block text-[10px] font-medium text-[#777]">
                  Start time
                </label>

                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(event) =>
                    setStartTime(
                      event.target.value
                    )
                  }
                  className="h-[38px] w-full rounded-md border border-[#e5e8e6] px-3 text-[10px] outline-none focus:border-[#00b341]"
                />

              </div>

              <div>

                <label className="mb-2 block text-[10px] font-medium text-[#777]">
                  Delay between emails
                </label>

                <div className="relative">

                  <input
                    type="number"
                    min="0"
                    value={delaySeconds}
                    onChange={(event) =>
                      setDelaySeconds(
                        event.target.value
                      )
                    }
                    className="h-[38px] w-full rounded-md border border-[#e5e8e6] px-3 pr-14 text-[11px] outline-none focus:border-[#00b341]"
                  />

                  <span className="absolute right-3 top-[12px] text-[9px] text-[#999]">
                    sec
                  </span>

                </div>

              </div>

              <div>

                <label className="mb-2 block text-[10px] font-medium text-[#777]">
                  Hourly limit
                </label>

                <div className="relative">

                  <input
                    type="number"
                    min="1"
                    value={hourlyLimit}
                    onChange={(event) =>
                      setHourlyLimit(
                        event.target.value
                      )
                    }
                    className="h-[38px] w-full rounded-md border border-[#e5e8e6] px-3 pr-14 text-[11px] outline-none focus:border-[#00b341]"
                  />

                  <span className="absolute right-3 top-[12px] text-[9px] text-[#999]">
                    / hour
                  </span>

                </div>

              </div>

            </div>

            {/* Body */}
            <div>

              <label className="mb-2 block text-[10px] font-medium text-[#777]">
                Body
              </label>

              <textarea
                value={body}
                onChange={(event) =>
                  setBody(
                    event.target.value
                  )
                }
                placeholder="Type your email..."
                className="h-[300px] w-full resize-none rounded-md border border-[#e5e8e6] p-4 text-[11px] outline-none placeholder:text-[#aaa] focus:border-[#00b341]"
              />

            </div>

            {/* Errors */}
            {error && (
              <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[10px] text-red-600">
                {error}
              </div>
            )}

            {/* Success */}
            {success && (
              <div className="mt-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-[10px] text-green-700">
                {success}
              </div>
            )}

            {/* Footer */}
            <div className="mt-4 flex items-center justify-between">

              <p className="text-[9px] text-[#999]">
                {recipients.length} recipient
                {recipients.length === 1
                  ? ""
                  : "s"}
              </p>

              <p className="text-[9px] text-[#999]">
                Delay: {delaySeconds}s · Limit:{" "}
                {hourlyLimit}/hour
              </p>

            </div>

          </div>
        </section>
      </div>
    </main>
  );
}