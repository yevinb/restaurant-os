import Link from "next/link";

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy">
      <p className="text-sm text-zinc-500">Last updated: July 2026</p>

      <section>
        <h2 className="text-lg font-semibold text-zinc-900">1. Who we are</h2>
        <p>
          RestaurantOS (&quot;we&quot;, &quot;us&quot;) provides restaurant management
          software. This policy explains how we collect, use, and protect personal data
          when you use our platform.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-zinc-900">2. Data we collect</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Account data: name, email, restaurant details</li>
          <li>Guest data you enter: names, emails, phone numbers, reservation history</li>
          <li>Usage data: pages visited, features used, device and browser information</li>
          <li>Payment data: processed by Stripe; we do not store card numbers</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-zinc-900">3. How we use data</h2>
        <p>
          We use data to provide and improve the service, send transactional emails
          (confirmations, password resets), process payments, and provide customer
          support. Marketing emails to your guests are sent on your behalf when you
          initiate campaigns.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-zinc-900">4. Legal basis (GDPR)</h2>
        <p>
          We process data based on contract performance (providing the service),
          legitimate interests (security, analytics), and consent where required
          (marketing to your guests — your responsibility as data controller).
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-zinc-900">5. Data retention</h2>
        <p>
          We retain account data while your subscription is active and for up to 90
          days after cancellation, unless longer retention is required by law.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-zinc-900">6. Your rights</h2>
        <p>
          You may request access, correction, deletion, or export of your personal
          data. Contact{" "}
          <a href="mailto:privacy@restaurantos.app" className="text-zinc-900 underline">
            privacy@restaurantos.app
          </a>
          . EU/UK residents may lodge a complaint with their supervisory authority.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-zinc-900">7. Security</h2>
        <p>
          We use encryption in transit, hashed passwords, and tenant isolation to
          protect your data. No system is 100% secure; please use strong passwords.
        </p>
      </section>
    </LegalLayout>
  );
}

function LegalLayout({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-zinc-100">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-6">
          <Link href="/" className="font-semibold text-zinc-900">
            RestaurantOS
          </Link>
          <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-900">
            Back to home
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-bold text-zinc-900">{title}</h1>
        <div className="prose prose-zinc mt-8 space-y-6 text-zinc-600">{children}</div>
      </main>
    </div>
  );
}
