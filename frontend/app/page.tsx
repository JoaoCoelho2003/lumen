"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

export default function Home() {
  const { data: session, status } = useSession();

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 px-6 py-16 text-white">
      <section className="w-full max-w-2xl rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-md sm:p-10">
        <p className="mb-3 text-sm uppercase tracking-[0.35em] text-emerald-300/80">
          Lumen
        </p>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Safe routes for the city.
        </h1>
        <p className="mt-4 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
          Find safer paths, check route guidance, and stay informed while you move
          through the city.
        </p>

        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
          {status === "loading" ? (
            <div className="rounded-full border border-white/15 px-5 py-3 text-sm text-slate-300">
              Checking session...
            </div>
          ) : session ? (
            <>
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-5 py-4 text-sm text-emerald-100">
                Signed in as <span className="font-medium">{session.user?.name || session.user?.email}</span>
              </div>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center justify-center rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Create account
              </Link>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
