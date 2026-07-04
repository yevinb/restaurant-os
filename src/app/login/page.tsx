import { Suspense } from "react";
import LoginPage from "./login-client";

export default function Login() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <LoginPage />
    </Suspense>
  );
}
