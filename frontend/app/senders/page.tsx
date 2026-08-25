"use client";

import { FormEvent, useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import ThemeToggle from "@/components/theme-toggle";
import {
  addSender,
  deleteSender,
  getCurrentUser,
} from "@/lib/api";

interface Sender {
  id: string;
  email: string;
  name: string | null;
  hourlyLimit: number;
}

export default function SendersPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [userId, setUserId] = useState("");
  const [senders, setSenders] = useState<Sender[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [hourlyLimit, setHourlyLimit] =
    useState("200");

  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] =
    useState<string | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [profileOpen, setProfileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (status === "loading") {
      return;
    }

    if (status === "unauthenticated") {
      router.push("/");
      return;
    }

    const userEmail = session?.user?.email;

    if (!userEmail) {
      setError(
        "Unable to determine logged-in user."
      );
      setLoading(false);
      return;
    }

    const loadSenders = async () => {
      try {
        setLoading(true);
        setError("");

        const data =
          await getCurrentUser(userEmail);

        setUserId(data.user.id);
        setSenders(data.senders);
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Failed to load senders."
        );
      } finally {
        setLoading(false);
      }
    };

    loadSenders();
  }, [session, status, router]);

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

  const handleAddSender = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    const normalizedEmail =
      email.trim().toLowerCase();

    const normalizedName = name.trim();

    const limit = Number(hourlyLimit);

    if (!normalizedEmail) {
      setError("Email address is required.");
      return;
    }

    if (!normalizedName) {
      setError("Display name is required.");
      return;
    }

    if (
      !Number.isInteger(limit) ||
      limit <= 0
    ) {
      setError(
        "Hourly limit must be a positive integer."
      );
      return;
    }

    setSaving(true);

    try {
      const sender = await addSender({
        userId,
        email: normalizedEmail,
        name: normalizedName,
        hourlyLimit: limit,
      });

      setSenders((current) => [
        ...current,
        sender,
      ]);

      setEmail("");
      setName("");
      setHourlyLimit("200");
      setShowForm(false);

      setSuccess(
        "Sender added successfully."
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to add sender."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSender = async (
    senderId: string
  ) => {
    setError("");
    setSuccess("");

    if (senders.length <= 1) {
      setError(
        "You must keep at least one sender."
      );
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to remove this sender?"
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(senderId);

    try {
      await deleteSender(
        senderId,
        userId
      );

      setSenders((current) =>
        current.filter(
          (sender) =>
            sender.id !== senderId
        )
      );

      setSuccess(
        "Sender removed successfully."
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to remove sender."
      );
    } finally {
      setDeletingId(null);
    }
  };

  if (status === "loading" || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white text-sm text-[#999] dark:bg-[#151817] dark:text-[#aeb7b2]">
        Loading senders...
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

          <button
            type="button"
            onClick={() => setMobileSidebarOpen(false)}
            className="absolute right-3 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-lg text-[#777] hover:bg-[#f2f5f3] md:hidden dark:hover:bg-[#202522]"
            aria-label="Close sidebar"
          >
            ×
          </button>

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

          <button
            type="button"
            onClick={() => {
              setMobileSidebarOpen(false);
              router.push("/dashboard");
            }}
            title="Scheduled emails"
            className={`mb-1 flex h-[34px] w-full cursor-pointer items-center rounded-lg text-[11px] text-[#555] hover:bg-[#f5f8f6] dark:text-[#b8c0bb] dark:hover:bg-[#1c211f] ${
              sidebarCollapsed
                ? "justify-center px-0"
                : "gap-2 px-2"
            }`}
          >
            <span>◷</span>
            {!sidebarCollapsed && <span>Scheduled</span>}
          </button>

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
            className={`mt-3 flex h-[34px] w-full cursor-pointer items-center rounded-lg bg-[#e4f6ed] text-[11px] text-[#303030] dark:bg-[#1d3a2b] dark:text-[#e8f5ed] ${
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

            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="truncate text-[12px] text-[#555] hover:text-[#202124] dark:text-[#b8c0bb] dark:hover:text-white"
            >
              ← Back
            </button>

            <div className="ml-auto flex items-center gap-2">
              <ThemeToggle />

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

          {/* Content */}
          <div className="mx-auto w-full max-w-[900px] px-4 py-6 sm:px-6 sm:py-8 md:px-10 md:py-10">

            <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">

              <div>
                <h1 className="text-[22px] font-semibold">
                  Senders
                </h1>

                <p className="mt-1 text-[11px] text-[#999] dark:text-[#8f9993]">
                  Manage the email accounts you
                  use to send messages.
                </p>
              </div>

              <button
                onClick={() => {
                  setShowForm(
                    (current) => !current
                  );
                  setError("");
                  setSuccess("");
                }}
                className="cursor-pointer rounded-md bg-[#00b341] px-5 py-2.5 text-[10px] font-medium text-white transition hover:bg-[#00a83d]"
              >
                {showForm
                  ? "Cancel"
                  : "+ Add Sender"}
              </button>

            </div>

            {/* Messages */}
            {error && (
              <div className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-[10px] text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-5 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-[10px] text-green-700 dark:border-green-900/50 dark:bg-green-950/30 dark:text-green-400">
                {success}
              </div>
            )}

            {/* Add Sender Form */}
            {showForm && (
              <form
                onSubmit={handleAddSender}
                className="mb-7 rounded-xl border border-[#e5e8e6] bg-[#fafcfb] p-6 dark:border-[#37413c] dark:bg-[#1c211f]"
              >

                <h2 className="mb-5 text-[14px] font-semibold">
                  Add Sender
                </h2>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                  {/* Email */}
                  <div>
                    <label className="mb-2 block text-[10px] font-medium text-[#777] dark:text-[#aeb7b2]">
                      Email address
                    </label>

                    <input
                      type="email"
                      value={email}
                      onChange={(event) =>
                        setEmail(
                          event.target.value
                        )
                      }
                      placeholder="sender@example.com"
                      className="h-[40px] w-full rounded-md border border-[#e5e8e6] bg-white px-3 text-[11px] outline-none placeholder:text-[#aaa] focus:border-[#00b341] dark:border-[#37413c] dark:bg-[#202522] dark:text-white dark:placeholder:text-[#777]"
                    />
                  </div>

                  {/* Name */}
                  <div>
                    <label className="mb-2 block text-[10px] font-medium text-[#777] dark:text-[#aeb7b2]">
                      Display name
                    </label>

                    <input
                      type="text"
                      value={name}
                      onChange={(event) =>
                        setName(
                          event.target.value
                        )
                      }
                      placeholder="My Work Email"
                      className="h-[40px] w-full rounded-md border border-[#e5e8e6] bg-white px-3 text-[11px] outline-none placeholder:text-[#aaa] focus:border-[#00b341] dark:border-[#37413c] dark:bg-[#202522] dark:text-white dark:placeholder:text-[#777]"
                    />
                  </div>

                </div>

                {/* Hourly limit */}
                <div className="mt-4 max-w-[300px]">

                  <label className="mb-2 block text-[10px] font-medium text-[#777] dark:text-[#aeb7b2]">
                    Hourly limit
                  </label>

                  <input
                    type="number"
                    min="1"
                    value={hourlyLimit}
                    onChange={(event) =>
                      setHourlyLimit(
                        event.target.value
                      )
                    }
                    className="h-[40px] w-full rounded-md border border-[#e5e8e6] bg-white px-3 text-[11px] outline-none focus:border-[#00b341] dark:border-[#37413c] dark:bg-[#202522] dark:text-white"
                  />

                </div>

                <div className="mt-5 flex justify-stretch sm:justify-end">

                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full cursor-pointer rounded-md bg-[#00b341] px-5 py-2.5 text-[10px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                  >
                    {saving
                      ? "Adding..."
                      : "Add Sender"}
                  </button>

                </div>

              </form>
            )}

            {/* Sender List */}
            <div className="space-y-3">

              {senders.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#dfe4e1] py-16 text-center dark:border-[#37413c]">
                  <p className="text-[12px] text-[#888] dark:text-[#8f9993]">
                    No senders connected.
                  </p>

                  <button
                    onClick={() =>
                      setShowForm(true)
                    }
                    className="mt-3 cursor-pointer text-[10px] font-medium text-[#00a943] hover:underline"
                  >
                    Add your first sender
                  </button>
                </div>
              ) : (
                senders.map((sender) => (
                  <div
                    key={sender.id}
                    className="flex flex-col gap-4 rounded-xl border sm:flex-row sm:items-center sm:justify-between border-[#e5e8e6] bg-white px-5 py-4 dark:border-[#37413c] dark:bg-[#1c211f]"
                  >

                    <div className="flex min-w-0 items-center gap-4">

                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e7f7ee] text-[14px] text-[#0aaf51] dark:bg-[#193b2a]">
                        ✉
                      </div>

                      <div className="min-w-0">

                        <p className="truncate text-[12px] font-medium">
                          {sender.email}
                        </p>

                        <p className="mt-1 truncate text-[9px] text-[#999] dark:text-[#8f9993]">
                          {sender.name ??
                            "Sender"}{" "}
                          ·{" "}
                          {sender.hourlyLimit}{" "}
                          emails/hour
                        </p>

                      </div>

                    </div>

                    <button
                      onClick={() =>
                        handleDeleteSender(
                          sender.id
                        )
                      }
                      disabled={
                        deletingId ===
                        sender.id ||
                        senders.length <= 1
                      }
                      title={
                        senders.length <= 1
                          ? "You must keep at least one sender"
                          : "Remove sender"
                      }
                      className="w-full cursor-pointer rounded-md px-3 py-2 text-[10px] text-[#d9534f] sm:w-auto hover:bg-[#fff1f0] disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-[#351d1d]"
                    >
                      {deletingId ===
                      sender.id
                        ? "Removing..."
                        : "Remove"}
                    </button>

                  </div>
                ))
              )}

            </div>

          </div>
        </section>
      </div>
    </main>
  );
}