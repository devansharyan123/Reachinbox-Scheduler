"use client";

import { useRef, useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import ThemeToggle from "@/components/theme-toggle";
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

  const [senders, setSenders] =
    useState<Sender[]>([]);

  const [selectedSenderId, setSelectedSenderId] =
    useState("");

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

    const loadSenders = async () => {
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

        setSenders(data.senders);

        const firstSender = data.senders[0];

        setSelectedSenderId(firstSender.id);

        setHourlyLimit(
          String(firstSender.hourlyLimit)
        );
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Failed to load senders."
        );
      } finally {
        setLoadingSender(false);
      }
    };

    loadSenders();
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

    if (!selectedSenderId) {
      setError(
        "Please select a sender account."
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
        senderId: selectedSenderId,
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
    <main className="min-h-screen bg-white text-[#202124] dark:bg-[#151817] dark:text-[#f1f3f2]">
      <div className="flex min-h-screen">

        {/* Sidebar */}
        <aside className="w-[190px] shrink-0 border-r border-[#eeeeee] px-5 py-6 dark:border-[#292e2b]">

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

          <button
            type="button"
            onClick={() => router.push("/senders")}
            className="mt-2 flex h-[31px] w-full cursor-pointer items-center gap-2 rounded-lg px-2 text-[11px] text-[#555] hover:bg-[#f5f8f6] dark:text-[#b8c0bb] dark:hover:bg-[#1c211f]"
          >
            <span>✉</span>
            Senders
          </button>

        </aside>

        {/* Main */}
        <section className="flex min-w-0 flex-1 flex-col">

          {/* Header */}
          <header className="flex h-[72px] items-center justify-between border-b border-[#eeeeee] px-7 dark:border-[#292e2b]">

            <a
              href="/dashboard"
              className="flex cursor-pointer items-center gap-2 text-[12px] text-[#555] dark:text-[#b8c0bb]"
            >
              ← Back
            </a>

            <div className="flex items-center gap-2">
              <ThemeToggle />

              <button
                type="button"
                onClick={handleSchedule}
                disabled={
                  isScheduling ||
                  loadingSender ||
                  !selectedSenderId
                }
                className="cursor-pointer rounded-md bg-[#00b341] px-5 py-2 text-[10px] font-medium text-white hover:bg-[#00a83d] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loadingSender
                  ? "Loading..."
                  : isScheduling
                    ? "Scheduling..."
                    : "Schedule"}
              </button>
            </div>

          </header>

          {/* Compose */}
          <div className="mx-auto w-full max-w-[850px] px-10 py-8">

            <h1 className="mb-7 text-[20px] font-semibold">
              Compose New Email
            </h1>

            {/* From */}
            <div className="mb-5">

              <label className="mb-2 block text-[10px] font-medium text-[#777] dark:text-[#aeb7b2]">
                From
              </label>

              <select
                value={selectedSenderId}
                onChange={(event) => {
                  const newSenderId = event.target.value;

                  setSelectedSenderId(newSenderId);

                  const selectedSender = senders.find(
                    (item) => item.id === newSenderId
                  );

                  if (selectedSender) {
                    setHourlyLimit(
                      String(selectedSender.hourlyLimit)
                    );
                  }
                }}
                disabled={loadingSender || senders.length === 0}
                className="h-[38px] w-full cursor-pointer appearance-none rounded-md border border-[#e5e8e6] bg-[#f8faf9] px-3 text-[11px] text-[#202124] outline-none transition focus:border-[#00b341] disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#37413c] dark:bg-[#202522] dark:text-[#f1f3f2]"
              >
                {loadingSender ? (
                  <option value="">
                    Loading senders...
                  </option>
                ) : senders.length === 0 ? (
                  <option value="">
                    No senders available
                  </option>
                ) : (
                  senders.map((item) => (
                    <option
                      key={item.id}
                      value={item.id}
                    >
                      {item.email}
                      {item.name
                        ? ` — ${item.name}`
                        : ""}
                    </option>
                  ))
                )}
              </select>

            </div>

            {/* Recipients */}
            <div className="mb-5">

              <div className="mb-2 flex items-center justify-between">

                <label className="text-[10px] font-medium text-[#777] dark:text-[#aeb7b2]">
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

              <div className="min-h-[44px] rounded-md border border-[#e5e8e6] p-2 dark:border-[#37413c] dark:bg-[#202522]">
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

              <label className="mb-2 block text-[10px] font-medium text-[#777] dark:text-[#aeb7b2]">
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
                className="h-[38px] w-full rounded-md border border-[#e5e8e6] bg-white px-3 text-[11px] text-[#202124] outline-none placeholder:text-[#aaa] focus:border-[#00b341] dark:border-[#37413c] dark:bg-[#202522] dark:text-[#f1f3f2] dark:placeholder:text-[#777]"
              />

            </div>

            {/* Scheduling */}
            <div className="mb-5 grid grid-cols-3 gap-4">

              <div>

                <label className="mb-2 block text-[10px] font-medium text-[#777] dark:text-[#aeb7b2]">
                  Start time
                </label>

                <div>
                  <input
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    onClick={(e) => {
                      e.currentTarget.showPicker?.();
                    }}
                    min={new Date().toISOString().slice(0, 16)}
                    className="w-full rounded-lg border border-[#e5e7eb] bg-white px-4 py-3 text-sm text-[#202124] outline-none transition focus:border-[#16b364] dark:border-[#37413c] dark:bg-[#202522] dark:text-[#f1f3f2]"
                  />
                </div>

              </div>

              <div>

                <label className="mb-2 block text-[10px] font-medium text-[#777] dark:text-[#aeb7b2]">
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
                    className="h-[38px] w-full rounded-md border border-[#e5e8e6] bg-white px-3 pr-14 text-[11px] text-[#202124] outline-none focus:border-[#00b341] dark:border-[#37413c] dark:bg-[#202522] dark:text-[#f1f3f2]"
                  />

                  <span className="absolute right-3 top-[12px] text-[9px] text-[#999]">
                    sec
                  </span>

                </div>

              </div>

              <div>

                <label className="mb-2 block text-[10px] font-medium text-[#777] dark:text-[#aeb7b2]">
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
                    className="h-[38px] w-full rounded-md border border-[#e5e8e6] bg-white px-3 pr-14 text-[11px] text-[#202124] outline-none focus:border-[#00b341] dark:border-[#37413c] dark:bg-[#202522] dark:text-[#f1f3f2]"
                  />

                  <span className="absolute right-3 top-[12px] text-[9px] text-[#999]">
                    / hour
                  </span>

                </div>

              </div>

            </div>

            {/* Body */}
            <div>

              <label className="mb-2 block text-[10px] font-medium text-[#777] dark:text-[#aeb7b2]">
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
                className="h-[300px] w-full resize-none rounded-md border border-[#e5e8e6] bg-white p-4 text-[11px] text-[#202124] outline-none placeholder:text-[#aaa] focus:border-[#00b341] dark:border-[#37413c] dark:bg-[#202522] dark:text-[#f1f3f2] dark:placeholder:text-[#777]"
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