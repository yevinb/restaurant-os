import Link from "next/link";
import { PLANS } from "@/lib/plans";
import { ButtonLink } from "@/components/ui/button";
import { UtensilsCrossed } from "lucide-react";

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-white">
              <UtensilsCrossed className="h-4 w-4" />
            </div>
            <span className="font-semibold">RestaurantOS</span>
          </Link>
          <div className="flex items-center gap-3">
            <ButtonLink href="/login" variant="ghost">
              Sign in
            </ButtonLink>
            <ButtonLink href="/register">Start free trial</ButtonLink>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-16">
        <h1 className="text-center text-4xl font-bold text-zinc-900">Pricing</h1>
        <p className="mt-3 text-center text-zinc-600">
          Choose the plan that fits your restaurant. Upgrade anytime.
        </p>

        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {Object.values(PLANS).map((plan) => (
            <div
              key={plan.id}
              className="rounded-xl border border-zinc-200 bg-white p-8 shadow-sm"
            >
              <h2 className="text-xl font-semibold">{plan.name}</h2>
              <p className="mt-4 text-4xl font-bold">
                £{plan.price}
                <span className="text-base font-normal text-zinc-500">/mo</span>
              </p>
              <ul className="mt-6 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-zinc-600">
                    <span className="text-emerald-500">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <ButtonLink href="/register" className="mt-8 w-full">
                Get started
              </ButtonLink>
            </div>
          ))}
        </div>
      </div>

      <footer className="border-t border-zinc-200 py-8 text-center text-sm text-zinc-500">
        <div className="flex justify-center gap-4">
          <Link href="/terms" className="hover:text-zinc-900">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-zinc-900">
            Privacy
          </Link>
        </div>
      </footer>
    </div>
  );
}
