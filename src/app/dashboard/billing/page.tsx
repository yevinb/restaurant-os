import { Suspense } from "react";
import BillingPage from "./billing-client";

export default function Billing() {
  return (
    <Suspense fallback={<div className="flex h-64 items-center justify-center">Loading...</div>}>
      <BillingPage />
    </Suspense>
  );
}
