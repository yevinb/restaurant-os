import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";

export function UpgradePrompt({ message }: { message: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center px-6 text-center">
      <p className="max-w-md text-zinc-600">{message}</p>
      <ButtonLink href="/dashboard/billing" className="mt-6">
        View plans
      </ButtonLink>
      <Link href="/dashboard" className="mt-3 text-sm text-zinc-500 hover:text-zinc-900">
        Back to dashboard
      </Link>
    </div>
  );
}
