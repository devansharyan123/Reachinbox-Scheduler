"use client";

import { useEffect, useMemo, useState } from "react";
import { signOut, useSession } from "next-auth/react";
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

  const [profileOpen, setProfileOpen] = useState(false);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

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
      <main className="min-h-screen overflow-x-hidden bg-white text-[#202124] dark:bg-[#151817] dark:text-[#f1f3f2]">
        Loading...
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-white text-[#202124] dark:bg-[#151817] dark:text-[#f1f3f2]">
      <div className="flex min-h-screen">

        {/* Sidebar */}
        {/* Mobile backdrop */}
        {mobileSidebarOpen && (
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setMobileSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
          />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 flex h-screen shrink-0 flex-col border-r border-[#eeeeee] bg-white px-3 py-5 transition-all duration-200 dark:border-[#292e2b] dark:bg-[#151817] md:static md:z-auto ${mobileSidebarOpen
            ? "translate-x-0"
            : "-translate-x-full md:translate-x-0"
            } ${sidebarCollapsed
              ? "md:w-[68px]"
              : "w-[190px] md:w-[210px]"
            }`}
        >
          {/* Sidebar header */}
          <div
            className={`mb-7 flex items-center ${sidebarCollapsed
              ? "justify-center"
              : "justify-between"
              }`}
          >
            {!sidebarCollapsed && (
              <div className="pl-2 text-[27px] font-black tracking-[-2px]">
                ONG
              </div>
            )}

            {/* Desktop collapse button */}
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

          {/* Mobile close button */}
          <button
            type="button"
            onClick={() =>
              setMobileSidebarOpen(false)
            }
            className="absolute right-3 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-lg text-[#777] hover:bg-[#f2f5f3] md:hidden dark:hover:bg-[#202522]"
            aria-label="Close sidebar"
          >
            ×
          </button>

          {/* Compose */}
          <button
            onClick={() => {
              setMobileSidebarOpen(false);
              router.push("/compose");
            }}
            className={`mb-7 h-[34px] cursor-pointer rounded-full border border-[#16b364] text-[11px] font-medium text-[#0aaf51] transition hover:bg-[#effcf5] ${sidebarCollapsed
              ? "px-0"
              : "w-full"
              }`}
            title="Compose new email"
          >
            {sidebarCollapsed ? "+" : "Compose"}
          </button>

          {/* Core */}
          {!sidebarCollapsed && (
            <p className="mb-2 px-2 text-[9px] font-medium uppercase tracking-wide text-[#a0a0a0]">
              Core
            </p>
          )}

          {/* Scheduled */}
          <button
            onClick={() => {
              setActiveTab("scheduled");
              setMobileSidebarOpen(false);
            }}
            title="Scheduled emails"
            className={`mb-1 flex h-[34px] w-full cursor-pointer items-center rounded-lg text-[11px] ${sidebarCollapsed
              ? "justify-center px-0"
              : "justify-between px-2"
              } ${activeTab === "scheduled"
                ? "bg-[#e4f6ed] text-[#303030] dark:bg-[#1d3a2b] dark:text-[#e8f5ed]"
                : "text-[#555] dark:text-[#b8c0bb]"
              }`}
          >
            <span className="flex items-center gap-2">
              <span>◷</span>

              {!sidebarCollapsed && (
                <span>Scheduled</span>
              )}
            </span>

            {!sidebarCollapsed && (
              <span className="text-[9px] text-[#999]">
                {scheduledCount}
              </span>
            )}
          </button>

          {/* Sent */}
          <button
            onClick={() => {
              setActiveTab("sent");
              setMobileSidebarOpen(false);
            }}
            title="Sent emails"
            className={`flex h-[34px] w-full cursor-pointer items-center rounded-lg text-[11px] ${sidebarCollapsed
              ? "justify-center px-0"
              : "justify-between px-2"
              } ${activeTab === "sent"
                ? "bg-[#e4f6ed] text-[#303030] dark:bg-[#1d3a2b] dark:text-[#e8f5ed]"
                : "text-[#555] dark:text-[#b8c0bb]"
              }`}
          >
            <span className="flex items-center gap-2">
              <span>➤</span>

              {!sidebarCollapsed && (
                <span>Sent</span>
              )}
            </span>

            {!sidebarCollapsed && (
              <span className="text-[9px] text-[#999]">
                {sentCount}
              </span>
            )}
          </button>

          {/* Senders */}
          <button
            onClick={() => {
              setMobileSidebarOpen(false);
              router.push("/senders");
            }}
            title="Senders"
            className={`mt-4 flex h-[34px] w-full cursor-pointer items-center rounded-lg text-[11px] text-[#555] hover:bg-[#f5f8f6] dark:text-[#b8c0bb] dark:hover:bg-[#1c211f] ${sidebarCollapsed
              ? "justify-center"
              : "gap-2 px-2"
              }`}
          >
            <span>✉</span>

            {!sidebarCollapsed && (
              <span>Senders</span>
            )}
          </button>
        </aside>

        {/* Main */}
        <section className="flex min-w-0 flex-1 flex-col">

          {/* Top bar */}
          <header className="flex min-h-[64px] items-center gap-2 border-b border-[#eeeeee] px-3 py-3 sm:gap-4 sm:px-5 md:h-[72px] md:px-7 dark:border-[#292e2b]">

            {/* Mobile menu */}
            <button
              type="button"
              onClick={() =>
                setMobileSidebarOpen(true)
              }
              aria-label="Open navigation"
              className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-lg text-[#777] hover:bg-[#f2f5f3] md:hidden dark:hover:bg-[#202522]"
            >
              ☰
            </button>

            <div className="flex h-[34px] min-w-0 max-w-[455px] flex-1 items-center rounded-full bg-[#f4f7f5] px-3 sm:px-4 dark:bg-[#202522]">

              <span className="mr-2 text-[13px] text-[#9da5a1]">
                ⌕
              </span>

              <input
                placeholder="Search"
                className="w-full min-w-0 bg-transparent text-[11px] outline-none placeholder:text-[#aeb5b1]"
              />

            </div>

            {/* Refresh */}
            <button
              onClick={loadEmails}
              className="hidden cursor-pointer text-[15px] text-[#8f9893] sm:block"
              title="Refresh"
            >
              ↻
            </button>

            <ThemeToggle />

            <div className="relative ml-auto">
              <button
                type="button"
                onClick={() => setProfileOpen((open) => !open)}
                className="cursor-pointer rounded-full focus:outline-none"
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
                      signOut({
                        callbackUrl: "/",
                      })
                    }
                    className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-red-400 transition hover:bg-[#252525]"
                  >
                    <span>↪</span>
                    Logout
                  </button>

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
                    className="group flex w-full cursor-pointer flex-col gap-2 border-b border-[#eeeeee] px-4 py-4 text-left transition hover:bg-[#fafcfb] sm:px-5 md:flex-row md:items-center md:gap-5 md:px-7 dark:border-[#292e2b] dark:hover:bg-[#1c211f]"
                  >

                    {/* Recipient */}
                    <div className="w-full shrink-0 truncate text-[11px] font-medium sm:max-w-[240px] md:w-[160px] lg:w-[190px]">
                      To: {email.recipient}
                    </div>

                    <div className="flex min-w-0 w-full flex-1 flex-wrap items-center gap-2 md:flex-nowrap">

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
                      <span className="max-w-full truncate text-[11px] font-medium md:max-w-[240px]">
                        {email.subject}
                      </span>

                      {/* Preview */}
                      <span className="w-full truncate text-[10px] text-[#9a9f9c] md:w-auto md:flex-1">
                        -{" "}
                        {getPreview(
                          email.body
                        )}
                      </span>

                    </div>

                    {/* Star */}
                    <span className="hidden shrink-0 text-[15px] text-[#c7cdca] transition group-hover:text-[#888] md:block">
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