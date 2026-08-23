"use client";

import { FormEvent, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
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
        <aside className="w-[190px] shrink-0 border-r border-[#eeeeee] px-5 py-6 dark:border-[#292e2b]">

          {/* Logo */}
          <div className="mb-7 text-[27px] font-black tracking-[-2px]">
            ONG
          </div>

          {/* User */}
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

          {/* Compose */}
          <button
            onClick={() =>
              router.push("/compose")
            }
            className="mb-7 h-[30px] w-full cursor-pointer rounded-full border border-[#16b364] text-[11px] font-medium text-[#0aaf51] transition hover:bg-[#effcf5] dark:hover:bg-[#173326]"
          >
            Compose
          </button>

          {/* Core */}
          <p className="mb-2 px-2 text-[9px] font-medium uppercase tracking-wide text-[#a0a0a0]">
            Core
          </p>

          <button
            onClick={() =>
              router.push("/dashboard")
            }
            className="mb-1 flex h-[31px] w-full cursor-pointer items-center gap-2 rounded-lg px-2 text-[11px] text-[#555] hover:bg-[#f5f8f6] dark:text-[#b8c0bb] dark:hover:bg-[#1c211f]"
          >
            <span>◷</span>
            Scheduled
          </button>

          <button
            onClick={() =>
              router.push("/dashboard")
            }
            className="flex h-[31px] w-full cursor-pointer items-center gap-2 rounded-lg px-2 text-[11px] text-[#555] hover:bg-[#f5f8f6] dark:text-[#b8c0bb] dark:hover:bg-[#1c211f]"
          >
            <span>➤</span>
            Sent
          </button>

          {/* Senders */}
          <button
            onClick={() =>
              router.push("/senders")
            }
            className="mt-4 flex h-[31px] w-full cursor-pointer items-center gap-2 rounded-lg bg-[#e4f6ed] px-2 text-[11px] text-[#303030] dark:bg-[#1d3a2b] dark:text-[#e8f5ed]"
          >
            <span>✉</span>
            Senders
          </button>

        </aside>

        {/* Main */}
        <section className="flex min-w-0 flex-1 flex-col">

          {/* Header */}
          <header className="flex h-[72px] items-center justify-between border-b border-[#eeeeee] px-7 dark:border-[#292e2b]">

            <button
              onClick={() =>
                router.push("/dashboard")
              }
              className="cursor-pointer text-[12px] text-[#555] hover:text-[#202124] dark:text-[#b8c0bb] dark:hover:text-white"
            >
              ← Back
            </button>

            <ThemeToggle />

          </header>

          {/* Content */}
          <div className="mx-auto w-full max-w-[900px] px-10 py-10">

            <div className="mb-8 flex items-center justify-between">

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

                <div className="grid grid-cols-2 gap-4">

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

                <div className="mt-5 flex justify-end">

                  <button
                    type="submit"
                    disabled={saving}
                    className="cursor-pointer rounded-md bg-[#00b341] px-5 py-2.5 text-[10px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
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
                    className="flex items-center justify-between rounded-xl border border-[#e5e8e6] bg-white px-5 py-4 dark:border-[#37413c] dark:bg-[#1c211f]"
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
                      className="cursor-pointer rounded-md px-3 py-2 text-[10px] text-[#d9534f] hover:bg-[#fff1f0] disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-[#351d1d]"
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