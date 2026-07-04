"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UtensilsCrossed } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const registered = searchParams.get("registered") === "true";
  const emailFromRegister = searchParams.get("email") || "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (emailFromRegister) {
      setEmail(emailFromRegister);
    }
  }, [emailFromRegister]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email: email.trim().toLowerCase(),
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email or password. Check your credentials and try again.");
      setLoading(false);
      return;
    }

    router.push(searchParams.get("callbackUrl") || "/dashboard");
  }

  return (
    <div className="flex min-h-screen">
      <div className="hidden w-1/2 bg-zinc-900 p-12 lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-2 text-white">
          <UtensilsCrossed className="h-6 w-6" />
          <span className="text-lg font-semibold">RestaurantOS</span>
        </div>
        <div>
          <h2 className="text-3xl font-bold text-white">
            Run your restaurant like a pro
          </h2>
          <p className="mt-4 text-zinc-400">
            Reservations, CRM, loyalty, and analytics in one platform.
          </p>
        </div>
        <p className="text-sm text-zinc-500">
          New here?{" "}
          <Link href="/register" className="text-white underline">
            Create an account
          </Link>
        </p>
      </div>

      <div className="flex w-full items-center justify-center p-8 lg:w-1/2">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-bold text-zinc-900">Sign in</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Enter the email and password you used when registering
          </p>

          {registered && (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Account created successfully. Sign in below to access your dashboard.
            </div>
          )}
          {searchParams.get("reset") === "true" && (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Password reset successfully. Sign in with your new password.
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label className="text-sm font-medium text-zinc-700">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@restaurant.com"
                className="mt-1"
                autoComplete="email"
                required
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-zinc-700">Password</label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-zinc-500 hover:text-zinc-900 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1"
                autoComplete="current-password"
                required
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full" loading={loading}>
              Sign in
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-zinc-600">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-medium text-zinc-900 hover:underline">
              Create account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
