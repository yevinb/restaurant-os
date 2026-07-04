import Link from "next/link";

export default function TermsPage() {
  return (
    <LegalLayout title="Terms of Service">
      <p className="text-sm text-zinc-500">Last updated: July 2026</p>

      <section>
        <h2 className="text-lg font-semibold text-zinc-900">1. Service</h2>
        <p>
          RestaurantOS provides restaurant management software including reservations,
          CRM, loyalty, marketing, analytics, and staff tools. By creating an account,
          you agree to these terms.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-zinc-900">2. Accounts</h2>
        <p>
          You are responsible for maintaining the security of your account credentials
          and for all activity under your restaurant account. You must provide accurate
          business information.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-zinc-900">3. Subscriptions & billing</h2>
        <p>
          Paid plans are billed monthly. You may upgrade, downgrade, or cancel at any
          time. Fees are non-refundable except where required by law. Free trials convert
          to paid plans unless cancelled before the trial ends.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-zinc-900">4. Customer data</h2>
        <p>
          You retain ownership of your restaurant and guest data. You grant RestaurantOS
          a licence to process that data solely to provide the service. You are
          responsible for obtaining consent from guests for marketing communications.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-zinc-900">5. Acceptable use</h2>
        <p>
          You may not use RestaurantOS for unlawful purposes, spam, or to send
          unsolicited marketing without proper consent. We may suspend accounts that
          violate these terms.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-zinc-900">6. Limitation of liability</h2>
        <p>
          RestaurantOS is provided &quot;as is&quot;. We are not liable for indirect,
          incidental, or consequential damages. Our total liability is limited to fees
          paid in the twelve months preceding a claim.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-zinc-900">7. Contact</h2>
        <p>
          Questions about these terms:{" "}
          <a href="mailto:legal@restaurantos.app" className="text-zinc-900 underline">
            legal@restaurantos.app
          </a>
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
