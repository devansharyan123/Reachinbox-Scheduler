"use client";

import { useState } from "react";

type EmailStatus = "scheduled" | "sent";

interface Email {
  id: number;
  recipient: string;
  subject: string;
  preview: string;
  time: string;
  status: EmailStatus;
}

const scheduledEmails: Email[] = [
  {
    id: 1,
    recipient: "John Smith",
    subject: "Meeting follow-up",
    preview: "Hi John, just wanted to follow up on our meeting...",
    time: "Thu 9:15:12 AM",
    status: "scheduled",
  },
  {
    id: 2,
    recipient: "Olive",
    subject: "Ramit, great to meet you",
    preview: "Hi Olive, just wanted to follow up on our meeting...",
    time: "Thu 8:15:12 PM",
    status: "scheduled",
  },
];

const sentEmails: Email[] = [
  {
    id: 3,
    recipient: "Sarah Wilson",
    subject: "Re: Project Update",
    preview: "Thanks for the update, Sarah. Looks good!",
    time: "Today, 10:23 AM",
    status: "sent",
  },
  {
    id: 4,
    recipient: "Support",
    subject: "Issue with login",
    preview: "I am having trouble logging in to the dashboard...",
    time: "Today, 9:42 AM",
    status: "sent",
  },
];

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<EmailStatus>("scheduled");

  const emails =
    activeTab === "scheduled" ? scheduledEmails : sentEmails;

  return (
    <main className="min-h-screen bg-white text-[#202124]">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="w-[190px] shrink-0 border-r border-[#eeeeee] px-5 py-6">
          {/* Logo */}
          <div className="mb-7 text-[27px] font-black tracking-[-2px]">
            ONG
          </div>

          {/* User */}
          <div className="mb-3 flex items-center gap-2 rounded-lg px-1 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#d9b08c] text-[11px] font-semibold">
              OB
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-medium">
                Oliver Brown
              </p>
              <p className="truncate text-[9px] text-[#9a9a9a]">
                oliver.brown@domain.io
              </p>
            </div>

            <span className="text-[11px] text-[#999]">⌄</span>
          </div>

          {/* Compose */}
          <button
            onClick={() => alert("Compose screen coming next")}
            className="mb-7 h-[30px] w-full cursor-pointer rounded-full border border-[#16b364] text-[11px] font-medium text-[#0aaf51] transition hover:bg-[#effcf5]"
          >
            Compose
          </button>

          {/* Core */}
          <p className="mb-2 px-2 text-[9px] font-medium uppercase tracking-wide text-[#a0a0a0]">
            Core
          </p>

          <button
            onClick={() => setActiveTab("scheduled")}
            className={`mb-1 flex h-[31px] w-full cursor-pointer items-center justify-between rounded-lg px-2 text-[11px] ${
              activeTab === "scheduled"
                ? "bg-[#e4f6ed] text-[#303030]"
                : "text-[#555]"
            }`}
          >
            <span className="flex items-center gap-2">
              <span>◷</span>
              Scheduled
            </span>

            <span className="text-[9px] text-[#999]">12</span>
          </button>

          <button
            onClick={() => setActiveTab("sent")}
            className={`flex h-[31px] w-full cursor-pointer items-center justify-between rounded-lg px-2 text-[11px] ${
              activeTab === "sent"
                ? "bg-[#e4f6ed] text-[#303030]"
                : "text-[#555]"
            }`}
          >
            <span className="flex items-center gap-2">
              <span>➤</span>
              Sent
            </span>

            <span className="text-[9px] text-[#999]">785</span>
          </button>
        </aside>

        {/* Main content */}
        <section className="flex min-w-0 flex-1 flex-col">
          {/* Top bar */}
          <header className="flex h-[72px] items-center gap-4 border-b border-[#eeeeee] px-7">
            <div className="flex h-[32px] max-w-[455px] flex-1 items-center rounded-full bg-[#f4f7f5] px-4">
              <span className="mr-2 text-[13px] text-[#9da5a1]">
                ⌕
              </span>

              <input
                placeholder="Search"
                className="w-full bg-transparent text-[11px] outline-none placeholder:text-[#aeb5b1]"
              />
            </div>

            <button className="cursor-pointer text-[15px] text-[#8f9893]">
              ♢
            </button>

            <button className="cursor-pointer text-[15px] text-[#8f9893]">
              ↻
            </button>

            <div className="ml-auto flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#d9b08c] text-[10px] font-semibold">
                OB
              </div>
            </div>
          </header>

          {/* Email list */}
          <div className="flex-1">
            {emails.length === 0 ? (
              <div className="flex h-[400px] items-center justify-center text-sm text-[#999]">
                No {activeTab} emails
              </div>
            ) : (
              emails.map((email) => (
                <button
                  key={email.id}
                  className="group flex w-full cursor-pointer items-center gap-5 border-b border-[#eeeeee] px-7 py-4 text-left transition hover:bg-[#fafcfb]"
                >
                  <div className="w-[120px] shrink-0 text-[11px] font-medium">
                    To: {email.recipient}
                  </div>

                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <span
                      className={`shrink-0 rounded-full px-2 py-1 text-[9px] ${
                        email.status === "scheduled"
                          ? "bg-[#fff0dc] text-[#e88721]"
                          : "bg-[#f0f2f2] text-[#747b78]"
                      }`}
                    >
                      {email.status === "scheduled"
                        ? email.time
                        : "Sent"}
                    </span>

                    <span className="shrink-0 text-[11px] font-medium">
                      {email.subject}
                    </span>

                    <span className="truncate text-[10px] text-[#9a9f9c]">
                      - {email.preview}
                    </span>
                  </div>

                  <span className="text-[15px] text-[#c7cdca] transition group-hover:text-[#888]">
                    ☆
                  </span>
                </button>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}