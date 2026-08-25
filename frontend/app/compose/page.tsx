"use client";

import { useRef, useState, useEffect } from "react";
import { signOut, useSession } from "next-auth/react";
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

  const [profileOpen, setProfileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

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

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileSidebarOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    if (!mobileSidebarOpen) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [mobileSidebarOpen]);

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
        {mobileSidebarOpen && (
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setMobileSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
          />
        )}

        <aside
          className={`fixed inset-y-0 left-0 z-50 flex h-screen shrink-0 flex-col border-r border-[#eeeeee] bg-white px-3 py-5 transition-all duration-200 dark:border-[#292e2b] dark:bg-[#151817] md:static md:z-auto ${
            mobileSidebarOpen
              ? "translate-x-0"
              : "-translate-x-full md:translate-x-0"
          } ${
            sidebarCollapsed
              ? "md:w-[68px]"
              : "w-[190px] md:w-[210px]"
          }`}
        >
          {/* Sidebar header */}
          <div
            className={`mb-7 flex items-center ${
              sidebarCollapsed
                ? "justify-center"
                : "justify-between"
            }`}
          >
            {!sidebarCollapsed && (
              <div className="pl-2 text-[27px] font-black tracking-[-2px]">
                ONG
              </div>
            )}

            <button
              type="button"
              aria-label={
                sidebarCollapsed
                  ? "Expand sidebar"
                  : "Collapse sidebar"
              }
              onClick={() =>
                setSidebarCollapsed(
                  (collapsed) => !collapsed
                )
              }
              className="hidden h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-[#7f8883] transition hover:bg-[#f2f5f3] dark:hover:bg-[#202522] md:flex"
            >
              {sidebarCollapsed ? "›" : "‹"}
            </button>
          </div>

          {/* Mobile close */}
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(false)}
            className="absolute right-3 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-lg text-[#777] hover:bg-[#f2f5f3] md:hidden dark:hover:bg-[#202522]"
            aria-label="Close sidebar"
          >
            ×
          </button>

          {/* Compose */}
          <button
            type="button"
            onClick={() => {
              setMobileSidebarOpen(false);
              router.push("/compose");
            }}
            className={`mb-7 h-[34px] cursor-pointer rounded-full border border-[#16b364] text-[11px] font-medium text-[#0aaf51] transition hover:bg-[#effcf5] ${
              sidebarCollapsed
                ? "px-0"
                : "w-full"
            }`}
            title="Compose new email"
          >
            {sidebarCollapsed ? "+" : "Compose"}
          </button>

          {!sidebarCollapsed && (
            <p className="mb-2 px-2 text-[9px] font-medium uppercase tracking-wide text-[#a0a0a0]">
              Core
            </p>
          )}

          <a
            href="/dashboard"
            onClick={() => setMobileSidebarOpen(false)}
            title="Scheduled emails"
            className={`mb-1 flex h-[34px] w-full items-center rounded-lg text-[11px] text-[#555] hover:bg-[#f5f8f6] dark:text-[#b8c0bb] dark:hover:bg-[#1c211f] ${
              sidebarCollapsed
                ? "justify-center px-0"
                : "gap-2 px-2"
            }`}
          >
            <span>◷</span>
            {!sidebarCollapsed && <span>Scheduled</span>}
          </a>

          <button
            type="button"
            onClick={() => {
              setMobileSidebarOpen(false);
              router.push("/dashboard");
            }}
            title="Sent emails"
            className={`mb-1 flex h-[34px] w-full cursor-pointer items-center rounded-lg text-[11px] text-[#555] hover:bg-[#f5f8f6] dark:text-[#b8c0bb] dark:hover:bg-[#1c211f] ${
              sidebarCollapsed
                ? "justify-center px-0"
                : "gap-2 px-2"
            }`}
          >
            <span>➤</span>
            {!sidebarCollapsed && <span>Sent</span>}
          </button>

          <button
            type="button"
            onClick={() => {
              setMobileSidebarOpen(false);
              router.push("/senders");
            }}
            title="Senders"
            className={`mt-3 flex h-[34px] w-full cursor-pointer items-center rounded-lg text-[11px] text-[#555] hover:bg-[#f5f8f6] dark:text-[#b8c0bb] dark:hover:bg-[#1c211f] ${
              sidebarCollapsed
                ? "justify-center"
                : "gap-2 px-2"
            }`}
          >
            <span>✉</span>
            {!sidebarCollapsed && <span>Senders</span>}
          </button>
        </aside>

        {/* Main */}
        <section className="flex min-w-0 flex-1 flex-col">

          {/* Header */}
          <header className="flex min-h-[64px] items-center gap-2 border-b border-[#eeeeee] px-3 py-3 sm:gap-4 sm:px-5 md:h-[72px] md:px-7 dark:border-[#292e2b]">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              aria-label="Open navigation"
              className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-lg text-[#777] hover:bg-[#f2f5f3] md:hidden dark:hover:bg-[#202522]"
            >
              ☰
            </button>

            <a
              href="/dashboard"
              className="min-w-0 truncate text-[12px] text-[#555] dark:text-[#b8c0bb]"
            >
              ← Back
            </a>

            <div className="ml-auto flex items-center gap-2">
              <ThemeToggle />

              <button
                type="button"
                onClick={handleSchedule}
                disabled={
                  isScheduling ||
                  loadingSender ||
                  !selectedSenderId
                }
                className="cursor-pointer rounded-md bg-[#00b341] px-3 py-2 text-[10px] font-medium text-white hover:bg-[#00a83d] disabled:cursor-not-allowed disabled:opacity-60 sm:px-5"
              >
                {loadingSender
                  ? "Loading..."
                  : isScheduling
                    ? "Scheduling..."
                    : "Schedule"}
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={() =>
                    setProfileOpen((open) => !open)
                  }
                  className="cursor-pointer rounded-full focus:outline-none"
                  aria-label="Open profile menu"
                >
                  {session?.user?.image ? (
                    <img
                      src={session.user.image}
                      alt={session.user.name ?? "User"}
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#d9b08c] text-[10px] font-semibold">
                      {session?.user?.name
                        ?.charAt(0)
                        .toUpperCase() ?? "U"}
                    </div>
                  )}
                </button>

                {profileOpen && (
                  <div className="absolute right-0 top-11 z-50 w-[min(16rem,calc(100vw-1.5rem))] rounded-xl border border-[#333] bg-[#1b1b1b] p-4 shadow-2xl">
                    <div className="flex items-center gap-3">
                      {session?.user?.image ? (
                        <img
                          src={session.user.image}
                          alt={session.user.name ?? "User"}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#d9b08c] text-sm font-semibold">
                          {session?.user?.name
                            ?.charAt(0)
                            .toUpperCase() ?? "U"}
                        </div>
                      )}

                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white">
                          {session?.user?.name ?? "User"}
                        </p>
                        <p className="truncate text-xs text-[#999]">
                          {session?.user?.email ?? ""}
                        </p>
                      </div>
                    </div>

                    <div className="my-3 border-t border-[#333]" />

                    <button
                      type="button"
                      onClick={() =>
                        signOut({ callbackUrl: "/" })
                      }
                      className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-red-400 transition hover:bg-[#252525]"
                    >
                      <span>↪</span>
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Compose */}
          <div className="mx-auto w-full max-w-[850px] px-4 py-6 sm:px-6 sm:py-8 md:px-10">

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
            <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">

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
                className="h-[260px] w-full resize-none sm:h-[300px] rounded-md border border-[#e5e8e6] bg-white p-4 text-[11px] text-[#202124] outline-none placeholder:text-[#aaa] focus:border-[#00b341] dark:border-[#37413c] dark:bg-[#202522] dark:text-[#f1f3f2] dark:placeholder:text-[#777]"
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
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

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