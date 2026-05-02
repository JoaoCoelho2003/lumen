"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useState, SyntheticEvent } from "react";
import { useRouter } from "next/navigation";
import AuthPageShell from "../../../components/auth-page-shell";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault(); 
    setError(null);

    const formData = new FormData(e.currentTarget);
    const username = formData.get("username");
    const password = formData.get("password");

    const result = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid username or password");
    } else {
      router.replace("/protected");
    }
  };

  return (
    <AuthPageShell
      eyebrow="Lumen"
      title="Welcome back"
      description="Sign in to check route guidance, saved places, and safe-path updates for the city."
      footer={
        <p className="text-sm text-slate-300">
          Need an account?{" "}
          <Link href="/register" className="font-medium text-emerald-300 hover:text-emerald-200">
            Create one
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
            name="username"
            type="text"
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
            name="password"
            type="password"
            placeholder="Password"
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
          className="inline-flex w-full items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
        >
          Login
        </button>
      </form>
    </AuthPageShell>
  );
}