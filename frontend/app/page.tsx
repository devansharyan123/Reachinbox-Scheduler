"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";


export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    console.log("Email login:", {
      email,
      password,
    });
  };

 const handleGoogleLogin = async () => {
  await signIn("google", {
    callbackUrl: "/dashboard",
  });
};

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6">
      <div className="w-full max-w-[338px] rounded-md border border-[#e5e7eb] px-10 py-9">
        <h1 className="mb-5 text-center text-[27px] font-semibold text-[#202124]">
          Login
        </h1>

        {/* Google Login */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          className="flex h-[34px] cursor-pointer w-full items-center justify-center gap-2 rounded-[7px] bg-[#e3f5ec] text-[12px] font-medium text-[#303030] transition hover:bg-[#d8f0e5]"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              fill="#4285F4"
              d="M21.35 12.27c0-.72-.06-1.41-.18-2.07H12v3.92h5.24a4.48 4.48 0 0 1-1.95 2.94v2.45h3.15c1.85-1.7 2.91-4.2 2.91-7.24z"
            />
            <path
              fill="#34A853"
              d="M12 21.75c2.64 0 4.86-.87 6.48-2.34l-3.15-2.45c-.87.58-1.98.92-3.33.92-2.56 0-4.73-1.73-5.51-4.06H3.23v2.53A9.79 9.79 0 0 0 12 21.75z"
            />
            <path
              fill="#FBBC05"
              d="M6.49 13.82A5.88 5.88 0 0 1 6.18 12c0-.63.11-1.24.31-1.82V7.65H3.23A9.75 9.75 0 0 0 2.25 12c0 1.57.38 3.05.98 4.35l3.26-2.53z"
            />
            <path
              fill="#EA4335"
              d="M12 6.12c1.44 0 2.73.5 3.75 1.48l2.81-2.81C16.86 3.25 14.64 2.25 12 2.25a9.79 9.79 0 0 0-8.77 5.4l3.26 2.53C7.27 7.85 9.44 6.12 12 6.12z"
            />
          </svg>
          <span>Login with Google</span>
        </button>

        {/* Divider */}
        <div className="my-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-[#eeeeee]" />

          <span className="text-[9px] text-[#b8b8b8]">
            or sign up through email
          </span>

          <div className="h-px flex-1 bg-[#eeeeee]" />
        </div>

        {/* Email Login */}
        <form onSubmit={handleLogin} className="space-y-2">
          <input
            type="email"
            placeholder="Email ID"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-[39px] w-full rounded-[7px] bg-[#f3f6f4] px-3 text-[11px] text-[#333] outline-none placeholder:text-[#8c9490] focus:ring-1 focus:ring-[#00b746]"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-[39px] w-full rounded-[7px] bg-[#f3f6f4] px-3 text-[11px] text-[#333] outline-none placeholder:text-[#8c9490] focus:ring-1 focus:ring-[#00b746]"
          />

          <button
            type="submit"
            className="mt-4 h-[34px] cursor-pointer w-full rounded-[7px] bg-[#00b341] text-[11px] font-medium text-white transition hover:bg-[#00a83d]"
          >
            Login
          </button>
        </form>
      </div>
    </main>
  );
}