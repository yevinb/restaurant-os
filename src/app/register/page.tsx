"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { UtensilsCrossed } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    restaurantName: "",
    country: "KW" as "GB" | "KW",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (form.password.length < 8) {
      setError("Password must be at least 8 characters");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
          restaurantName: form.restaurantName.trim(),
          country: form.country,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Registration failed. Please try again.");
        setLoading(false);
        return;
      }

      const email = encodeURIComponent(form.email.trim().toLowerCase());
      router.push(`/login?registered=true&email=${email}`);
    } catch {
      setError("Something went wrong. Please check your connection and try again.");
      setLoading(false);
    }
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
            Start your 14-day free trial
          </h2>
          <p className="mt-4 text-zinc-400">
            Create your account, then sign in to set up your restaurant.
          </p>
        </div>
        <p className="text-sm text-zinc-500">
          Already registered?{" "}
          <Link href="/login" className="text-white underline">
            Sign in
          </Link>
        </p>
      </div>

      <div className="flex w-full items-center justify-center p-8 lg:w-1/2">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-bold text-zinc-900">Create your account</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Step 1 of 2 — after this you&apos;ll sign in to your dashboard
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label className="text-sm font-medium text-zinc-700">Your name</label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Jane Smith"
                className="mt-1"
                autoComplete="name"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-zinc-700">Restaurant name</label>
              <Input
                value={form.restaurantName}
                onChange={(e) => setForm({ ...form, restaurantName: e.target.value })}
                placeholder="The Riverside Kitchen"
                className="mt-1"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-zinc-700">Country</label>
              <Select
                value={form.country}
                onChange={(e) =>
                  setForm({ ...form, country: e.target.value as "GB" | "KW" })
                }
                className="mt-1"
              >
                <option value="KW">Kuwait</option>
                <option value="GB">United Kingdom</option>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-zinc-700">Email</label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@restaurant.com"
                className="mt-1"
                autoComplete="email"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-zinc-700">Password</label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Minimum 8 characters"
                className="mt-1"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}
            <Button type="submit" className="w-full" loading={loading}>
              Create account
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-zinc-600">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-zinc-900 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
