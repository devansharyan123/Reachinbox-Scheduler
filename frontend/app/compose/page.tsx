"use client";

import { useRef, useState } from "react";

export default function ComposePage() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [recipients, setRecipients] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [delaySeconds, setDelaySeconds] = useState("2");
  const [hourlyLimit, setHourlyLimit] = useState("200");
  const [startTime, setStartTime] = useState("");
  const [fileName, setFileName] = useState("");

  const handleFileUpload = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setFileName(file.name);

    const reader = new FileReader();

    reader.onload = () => {
      const text = String(reader.result ?? "");

      const emails = text
        .split(/[\n,;\r]+/)
        .map((value) => value.trim().toLowerCase())
        .filter((value) =>
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
        );

      setRecipients(
        Array.from(new Set(emails))
      );
    };

    reader.readAsText(file);
  };

  const removeRecipient = (email: string) => {
    setRecipients((current) =>
      current.filter((item) => item !== email)
    );
  };

  const handleSchedule = () => {
    console.log({
      recipients,
      subject,
      body,
      delaySeconds,
      hourlyLimit,
      startTime,
    });
  };

  return (
    <main className="min-h-screen bg-white text-[#202124]">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="w-[190px] shrink-0 border-r border-[#eeeeee] px-5 py-6">
          <div className="mb-7 text-[27px] font-black tracking-[-2px]">
            ONG
          </div>

          <div className="mb-3 flex items-center gap-2 px-1 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#d9b08c] text-[11px] font-semibold">
              OB
            </div>

            <div className="min-w-0">
              <p className="truncate text-[12px] font-medium">
                Oliver Brown
              </p>

              <p className="truncate text-[9px] text-[#9a9a9a]">
                oliver.brown@domain.io
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

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="cursor-pointer rounded-md border border-[#e5e8e6] px-4 py-2 text-[10px] text-[#555] hover:bg-[#f7f9f8]"
              >
                Save Draft
              </button>

              <button
                type="button"
                onClick={handleSchedule}
                className="cursor-pointer rounded-md bg-[#00b341] px-5 py-2 text-[10px] font-medium text-white hover:bg-[#00a83d]"
              >
                Schedule
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
              <label className="mb-2 block text-[10px] font-medium text-[#777]">
                From
              </label>

              <select className="h-[38px] w-full cursor-pointer rounded-md border border-[#e5e8e6] bg-white px-3 text-[11px] outline-none focus:border-[#00b341]">
                <option>
                  oliver.brown@domain.io
                </option>
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
                {recipients.length === 0 ? (
                  <span className="px-1 text-[10px] text-[#aaa]">
                    Enter recipients or upload a CSV
                  </span>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
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
                  </div>
                )}
              </div>

              {fileName && (
                <p className="mt-2 text-[9px] text-[#888]">
                  {fileName} · {recipients.length} valid
                  email
                  {recipients.length === 1 ? "" : "s"} detected
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
                  setSubject(event.target.value)
                }
                placeholder="Enter email subject"
                className="h-[38px] w-full rounded-md border border-[#e5e8e6] px-3 text-[11px] outline-none placeholder:text-[#aaa] focus:border-[#00b341]"
              />
            </div>

            {/* Scheduling controls */}
            <div className="mb-5 grid grid-cols-3 gap-4">
              <div>
                <label className="mb-2 block text-[10px] font-medium text-[#777]">
                  Start time
                </label>

                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(event) =>
                    setStartTime(event.target.value)
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
                      setDelaySeconds(event.target.value)
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
                      setHourlyLimit(event.target.value)
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
                  setBody(event.target.value)
                }
                placeholder="Type your email..."
                className="h-[300px] w-full resize-none rounded-md border border-[#e5e8e6] p-4 text-[11px] outline-none placeholder:text-[#aaa] focus:border-[#00b341]"
              />
            </div>

            {/* Bottom info */}
            <div className="mt-4 flex items-center justify-between">
              <p className="text-[9px] text-[#999]">
                {recipients.length} recipient
                {recipients.length === 1 ? "" : "s"}
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