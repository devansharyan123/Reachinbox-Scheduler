"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import ThemeToggle from "@/components/theme-toggle";

import {
  getDashboardEmails,
  getCurrentUser,
  DashboardEmail,
} from "@/lib/api";

interface Sender {
  id: string;
  email: string;
  name: string | null;
  hourlyLimit: number;
}

type EmailStatus = "scheduled" | "sent";

export default function Dashboard() {
  const router = useRouter();

  const {
    data: session,
    status: sessionStatus,
  } = useSession();

  const [sender, setSender] =
    useState<Sender | null>(null);

  const [emails, setEmails] =
    useState<DashboardEmail[]>([]);

  const [activeTab, setActiveTab] =
    useState<EmailStatus>("scheduled");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  /*
   * Get the sender belonging to the
   * currently logged-in Google account.
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
      setLoading(false);
      return;
    }

    const loadUser = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await getCurrentUser(email);

        if (!data.senders.length) {
          throw new Error(
            "No sender is configured for this account."
          );
        }

        setSender(data.senders[0]);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load user"
        );

        setLoading(false);
      }
    };

    loadUser();
  }, [
    session,
    sessionStatus,
    router,
  ]);

  /*
   * Load emails belonging to the
   * authenticated user's sender.
   */
  const loadEmails = async () => {
    if (!sender) {
      return;
    }

    try {
      setLoading(true);
      setError("");

      const data =
        await getDashboardEmails(
          sender.id
        );

      setEmails(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load emails"
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * Once sender is available,
   * load its emails.
   */
  useEffect(() => {
    if (sender) {
      loadEmails();
    }
  }, [sender]);

  const filteredEmails = useMemo(() => {
    if (activeTab === "scheduled") {
      return emails.filter(
        (email) =>
          email.status === "SCHEDULED" ||
          email.status === "PROCESSING"
      );
    }

    return emails.filter(
      (email) =>
        email.status === "SENT"
    );
  }, [emails, activeTab]);

  const scheduledCount =
    emails.filter(
      (email) =>
        email.status === "SCHEDULED" ||
        email.status === "PROCESSING"
    ).length;

  const sentCount =
    emails.filter(
      (email) =>
        email.status === "SENT"
    ).length;

  const formatTime = (
    email: DashboardEmail
  ) => {
    const date =
      email.status === "SENT" &&
        email.sentAt
        ? new Date(email.sentAt)
        : new Date(email.scheduledAt);

    return date.toLocaleString(
      "en-US",
      {
        weekday: "short",
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
      }
    );
  };

  const getPreview = (
    body: string
  ) =>
    body.length > 70
      ? `${body.substring(0, 70)}...`
      : body;

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

          {/* Logo */}
          <div className="mb-7 text-[27px] font-black tracking-[-2px]">
            ONG
          </div>

          {/* User */}
          <div className="mb-3 flex items-center gap-2 rounded-lg px-1 py-2">

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

            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-medium">
                {session?.user?.name ??
                  "User"}
              </p>

              <p className="truncate text-[9px] text-[#9a9a9a]">
                {session?.user?.email}
              </p>
            </div>

          </div>

          {/* Compose */}
          <button
            onClick={() =>
              router.push("/compose")
            }
            className="mb-7 h-[30px] w-full cursor-pointer rounded-full border border-[#16b364] text-[11px] font-medium text-[#0aaf51] transition hover:bg-[#effcf5]"
          >
            Compose
          </button>

          {/* Core */}
          <p className="mb-2 px-2 text-[9px] font-medium uppercase tracking-wide text-[#a0a0a0]">
            Core
          </p>

          {/* Scheduled */}
          <button
            onClick={() =>
              setActiveTab("scheduled")
            }
            className={`mb-1 flex h-[31px] w-full cursor-pointer items-center justify-between rounded-lg px-2 text-[11px] ${activeTab === "scheduled"
              ? "bg-[#e4f6ed] text-[#303030] dark:bg-[#1d3a2b] dark:text-[#e8f5ed]"
              : "text-[#555] dark:text-[#b8c0bb]"
              }`}
          >
            <span className="flex items-center gap-2">
              <span>◷</span>
              Scheduled
            </span>

            <span className="text-[9px] text-[#999]">
              {scheduledCount}
            </span>
          </button>

          {/* Sent */}
          <button
            onClick={() =>
              setActiveTab("sent")
            }
            className={`flex h-[31px] w-full cursor-pointer items-center justify-between rounded-lg px-2 text-[11px] ${activeTab === "sent"
                ? "bg-[#e4f6ed] text-[#303030] dark:bg-[#1d3a2b] dark:text-[#e8f5ed]"
                : "text-[#555] dark:text-[#b8c0bb]"
              }`}
          >
            <span className="flex items-center gap-2">
              <span>➤</span>
              Sent
            </span>

            <span className="text-[9px] text-[#999]">
              {sentCount}
            </span>
          </button>
        </aside>

        {/* Main */}
        <section className="flex min-w-0 flex-1 flex-col">

          {/* Top bar */}
          <header className="flex h-[72px] items-center gap-4 border-b border-[#eeeeee] px-7 dark:border-[#292e2b]">

            <div className="flex h-[32px] max-w-[455px] flex-1 items-center rounded-full bg-[#f4f7f5] px-4 dark:bg-[#202522]">

              <span className="mr-2 text-[13px] text-[#9da5a1]">
                ⌕
              </span>

              <input
                placeholder="Search"
                className="w-full bg-transparent text-[11px] outline-none placeholder:text-[#aeb5b1]"
              />

            </div>

            {/* Refresh */}
            <button
              onClick={loadEmails}
              className="cursor-pointer text-[15px] text-[#8f9893]"
              title="Refresh"
            >
              ↻
            </button>

            <ThemeToggle />

            <div className="ml-auto">

              {session?.user?.image ? (
                <img
                  src={session.user.image}
                  alt=""
                  className="h-8 w-8 rounded-full"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#d9b08c] text-[10px] font-semibold">
                  {session?.user?.name
                    ?.charAt(0)
                    .toUpperCase() ?? "U"}
                </div>
              )}

            </div>

          </header>

          {/* Email list */}
          <div className="flex-1">

            {loading ? (
              <div className="flex h-[400px] items-center justify-center text-sm text-[#999] dark:text-[#777f7a]">
                Loading emails...
              </div>
            ) : error ? (
              <div className="flex h-[400px] flex-col items-center justify-center gap-3 text-sm text-[#999]">

                <p>{error}</p>

                <button
                  onClick={loadEmails}
                  className="cursor-pointer rounded-full border border-[#16b364] px-4 py-2 text-xs text-[#0aaf51] hover:bg-[#effcf5]"
                >
                  Retry
                </button>

              </div>
            ) : filteredEmails.length === 0 ? (
              <div className="flex h-[400px] items-center justify-center text-sm text-[#999]">
                No {activeTab} emails
              </div>
            ) : (
              filteredEmails.map(
                (email) => (
                  <button
                    key={email.id}
                    className="group flex w-full cursor-pointer items-center gap-5 border-b border-[#eeeeee] px-7 py-4 text-left transition hover:bg-[#fafcfb] dark:border-[#292e2b] dark:hover:bg-[#1c211f]"
                  >

                    {/* Recipient */}
                    <div className="w-[120px] shrink-0 text-[11px] font-medium">
                      To: {email.recipient}
                    </div>

                    <div className="flex min-w-0 flex-1 items-center gap-2">

                      {/* Status / time */}
                      <span
                        className={`shrink-0 rounded-full px-2 py-1 text-[9px] ${email.status ===
                          "SENT"
                          ? "bg-[#f0f2f2] text-[#747b78]"
                          : email.status ===
                            "PROCESSING"
                            ? "bg-[#e8f1ff] text-[#4d78b8]"
                            : "bg-[#fff0dc] text-[#e88721]"
                          }`}
                      >
                        {email.status ===
                          "SENT"
                          ? "Sent"
                          : email.status ===
                            "PROCESSING"
                            ? "Processing"
                            : formatTime(
                              email
                            )}
                      </span>

                      {/* Subject */}
                      <span className="shrink-0 text-[11px] font-medium">
                        {email.subject}
                      </span>

                      {/* Preview */}
                      <span className="truncate text-[10px] text-[#9a9f9c]">
                        -{" "}
                        {getPreview(
                          email.body
                        )}
                      </span>

                    </div>

                    {/* Star */}
                    <span className="text-[15px] text-[#c7cdca] transition group-hover:text-[#888]">
                      ☆
                    </span>

                  </button>
                )
              )
            )}

          </div>
        </section>
      </div>
    </main>
  );
}