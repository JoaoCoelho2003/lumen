"use client";

import Link from "next/link";
import { SyntheticEvent, useState } from "react";
import AuthPageShell from "../../../components/auth-page-shell";

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {    
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const username = formData.get("username") as string;
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      const apiBase = process.env.NEXT_PUBLIC_LUMEN_API_URL || "http://localhost:8000";
      const url = `${apiBase.replace(/\/+$/, "")}/auth/register`;

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, confirmPassword }),
      });

      if (res.ok) {
        window.location.href = "/login";
        return;
      }

      let errorMessage = "Unknown error";
      try {
        const contentType = res.headers.get("Content-Type") ?? "";
        if (contentType.includes("application/json")) {
          const errorData = await res.json();
          errorMessage = errorData.detail ?? errorData.message ?? errorMessage;
        } else {
          errorMessage = (await res.text()) || errorMessage;
        }
      } catch {
        errorMessage = `Request failed with status ${res.status}`;
      }

      setError(`Registration failed: ${errorMessage}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthPageShell
      eyebrow="Lumen"
      title="Create your account"
      description="Set up your profile to save safe routes and return to them quickly later."
      footer={
        <p className="text-sm text-slate-300">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-emerald-300 hover:text-emerald-200">
            Log in
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} method="POST" className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-200" htmlFor="username">
            Username
          </label>
          <input
            id="username"
            type="text"
            name="username"
            placeholder="Username"
            required
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-slate-500 outline-none transition focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/20"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-200" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            name="password"
            placeholder="Password"
            required
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-slate-500 outline-none transition focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/20"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-200" htmlFor="confirmPassword">
            Confirm password
          </label>
          <input
            id="confirmPassword"
            type="password"
            name="confirmPassword"
            placeholder="Confirm Password"
            required
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-slate-500 outline-none transition focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/20"
          />
        </div>

        {error && (
          <div className="rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex w-full items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Registering..." : "Register"}
        </button>
      </form>
    </AuthPageShell>
  );
}