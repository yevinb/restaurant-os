import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import {
  Calendar,
  BarChart3,
  Gift,
  Megaphone,
  Shield,
  UtensilsCrossed,
} from "lucide-react";

const features = [
  {
    icon: Calendar,
    title: "Reservations",
    desc: "Real-time booking, table assignment, and status tracking.",
  },
  {
    icon: Gift,
    title: "Loyalty & CRM",
    desc: "Know every guest. Reward regulars. Win back inactive diners.",
  },
  {
    icon: Megaphone,
    title: "Marketing",
    desc: "Segmented campaigns and automation that fill empty tables.",
  },
  {
    icon: BarChart3,
    title: "Analytics",
    desc: "Revenue, peak hours, repeat rates — all in one dashboard.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-zinc-100">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-white">
              <UtensilsCrossed className="h-4 w-4" />
            </div>
            <span className="font-semibold text-zinc-900">RestaurantOS</span>
          </Link>
          <div className="flex items-center gap-3">
            <ButtonLink href="/login" variant="ghost">
              Sign in
            </ButtonLink>
            <ButtonLink href="/register">Start free trial</ButtonLink>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs text-zinc-600">
          <Shield className="h-3 w-3" />
          Trusted by modern restaurants
        </div>
        <h1 className="mt-6 text-5xl font-bold tracking-tight text-zinc-900">
          The operating system
          <br />
          <span className="text-zinc-500">for your restaurant</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-600">
          Reservations, CRM, loyalty, marketing, analytics, staff scheduling,
          and AI insights — everything you need to run a profitable restaurant.
        </p>
        <div className="mt-10 flex justify-center gap-4">
          <ButtonLink href="/register" size="lg">
            Start 14-day free trial
          </ButtonLink>
          <ButtonLink href="/pricing" size="lg" variant="outline">
            View pricing
          </ButtonLink>
        </div>
      </section>

      <section className="border-t border-zinc-100 bg-zinc-50 py-20">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 md:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-zinc-200 bg-white p-6"
            >
              <f.icon className="h-6 w-6 text-zinc-900" />
              <h3 className="mt-4 font-semibold text-zinc-900">{f.title}</h3>
              <p className="mt-2 text-sm text-zinc-600">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <h2 className="text-3xl font-bold text-zinc-900">
            Simple, transparent pricing
          </h2>
          <p className="mt-3 text-zinc-600">From £99/month. No hidden fees.</p>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              { name: "Starter", price: 99, desc: "Essential tools for small venues" },
              { name: "Growth", price: 199, desc: "Full CRM, loyalty & marketing", featured: true },
              { name: "Pro", price: 499, desc: "AI assistant & advanced analytics" },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`rounded-xl border p-8 ${
                  plan.featured
                    ? "border-zinc-900 bg-zinc-900 text-white"
                    : "border-zinc-200 bg-white"
                }`}
              >
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <p className={`mt-2 text-sm ${plan.featured ? "text-zinc-300" : "text-zinc-500"}`}>
                  {plan.desc}
                </p>
                <p className="mt-6 text-4xl font-bold">
                  £{plan.price}
                  <span className={`text-base font-normal ${plan.featured ? "text-zinc-400" : "text-zinc-500"}`}>
                    /mo
                  </span>
                </p>
                <ButtonLink
                  href="/register"
                  className="mt-6 w-full"
                  variant={plan.featured ? "outline" : "primary"}
                >
                  Get started
                </ButtonLink>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-zinc-100 py-8 text-center text-sm text-zinc-500">
        <p>© {new Date().getFullYear()} RestaurantOS. Built for restaurants that mean business.</p>
        <div className="mt-2 flex justify-center gap-4">
          <Link href="/terms" className="hover:text-zinc-900">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-zinc-900">
            Privacy
          </Link>
          <Link href="/pricing" className="hover:text-zinc-900">
            Pricing
          </Link>
        </div>
      </footer>
    </div>
  );
}
