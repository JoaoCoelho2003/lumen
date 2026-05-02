"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import AuthPageShell from "../../components/auth-page-shell";

export default function Dashboard() {
  const router = useRouter();
  const { data: session, status } = useSession();

  async function handleLogout() {
    await signOut({ redirect: false });
    router.replace("/login");
    router.refresh();
  }

  if (status === "loading") {
    return (
      <AuthPageShell
        eyebrow="Lumen"
        title="Dashboard"
        description="Loading your secure session..."
      >
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
          Checking access...
        </div>
      </AuthPageShell>
    );
  }

  if (!session) {
    return (
      <AuthPageShell
        eyebrow="Lumen"
        title="You are not logged in"
        description="Log in to access your saved safe-route dashboard and account tools."
        footer={
          <Link
            href="/login"
            className="text-sm font-medium text-emerald-300 hover:text-emerald-200"
          >
            Go to login
          </Link>
        }
      >
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
          Your session is not active right now.
        </div>
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell
      eyebrow="Lumen"
      title="Welcome back"
      description="You’re signed in and ready to explore safe routes around the city."
      footer={
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center justify-center rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
        >
          Logout
        </button>
      }
    >
      <div className="space-y-3">
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
          Signed in as{" "}
          <span className="font-medium">
            {session.user?.name || session.user?.email}
          </span>
        </div>
        <p className="text-sm leading-7 text-slate-300">
          This page is now styled like the rest of the app and can be expanded
          with route preferences, bookmarked places, and map tools.
        </p>
      </div>
    </AuthPageShell>
  );
}
