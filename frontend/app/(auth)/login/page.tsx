"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useState, SyntheticEvent } from "react";
import { useRouter } from "next/navigation";
import AuthPageShell from "../../../components/auth-page-shell";
import { Button } from "@/components/ui/button";

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
      router.replace("/");
    }
  };

  return (
    <AuthPageShell
      eyebrow="Lumen"
      title="Welcome back"
      description="Sign in to check route guidance, saved places, and safe-path updates for the city."
      footer={
        <p className="text-center text-sm text-muted-foreground">
          Need an account?{" "}
          <Link
            href="/register"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Create one
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} method="POST" className="space-y-4">
        <div className="space-y-2">
          <label
            className="text-sm font-medium text-foreground"
            htmlFor="username"
          >
            Username
          </label>
          <input
            id="username"
            name="username"
            type="text"
            placeholder="Username"
            required
            className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground shadow-sm outline-none transition placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
          />
        </div>

        <div className="space-y-2">
          <label
            className="text-sm font-medium text-foreground"
            htmlFor="password"
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="Password"
            required
            className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground shadow-sm outline-none transition placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
          />
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <Button type="submit" size="lg" className="mt-2 w-full">
          Login
        </Button>
      </form>
    </AuthPageShell>
  );
}
