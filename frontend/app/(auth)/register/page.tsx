"use client";

import Link from "next/link";
import { SyntheticEvent, useState } from "react";
import { useRouter } from "next/navigation";
import AuthPageShell from "../../../components/auth-page-shell";
import { Button } from "@/components/ui/button";
import { useRegisterMutation } from "@/app/api/mutations/auth";

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const registerMutation = useRegisterMutation();

  const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const username = formData.get("username") as string;
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      await registerMutation.mutateAsync({
        username,
        password,
        confirmPassword,
      });
      router.replace("/login");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred",
      );
    }
  };

  return (
    <AuthPageShell
      eyebrow="Lumen"
      title="Create your account"
      description="Set up your profile to save safe routes and return to them quickly later."
      footer={
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Log in
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
            type="text"
            name="username"
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
            type="password"
            name="password"
            placeholder="Password"
            required
            className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground shadow-sm outline-none transition placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
          />
        </div>

        <div className="space-y-2">
          <label
            className="text-sm font-medium text-foreground"
            htmlFor="confirmPassword"
          >
            Confirm password
          </label>
          <input
            id="confirmPassword"
            type="password"
            name="confirmPassword"
            placeholder="Confirm Password"
            required
            className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground shadow-sm outline-none transition placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
          />
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <Button
          type="submit"
          disabled={registerMutation.isPending}
          size="lg"
          className="mt-2 w-full"
        >
          {registerMutation.isPending ? "Registering..." : "Register"}
        </Button>
      </form>
    </AuthPageShell>
  );
}
