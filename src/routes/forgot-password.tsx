import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { authClient, authEnabled } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { toast } from "sonner";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPassword,
});

const GENERIC =
  "If that email exists, we sent a link to reset your password.";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/reset-password`
          : "/reset-password";
      // Better Auth: POST /api/auth/request-password-reset
      const { error } = await authClient.requestPasswordReset({
        email: email.trim(),
        redirectTo,
      });
      if (error) {
        // Still show generic success to avoid account enumeration,
        // except when reset is disabled server-side.
        if (/disabled|isn't enabled|not enabled/i.test(error.message ?? "")) {
          toast.error(error.message ?? "Password reset is unavailable.");
          return;
        }
      }
      setSent(true);
      toast.success(GENERIC);
    } catch {
      setSent(true);
      toast.success(GENERIC);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-6 py-8">
      <p className="font-display text-sm tracking-[0.28em] text-muted uppercase">
        Livewell42
      </p>
      <h1 className="mt-2 font-display text-3xl tracking-tight">
        Forgot password
      </h1>
      <p className="mt-1 text-sm text-muted">
        Enter the email for your email/password account. We&apos;ll send a
        one-time reset link (expires in 1 hour).
      </p>

      {!authEnabled ? (
        <p className="mt-8 text-sm text-muted">Sign-in is disabled.</p>
      ) : sent ? (
        <div className="mt-6 space-y-4">
          <p className="rounded-lg border border-border bg-surface px-4 py-3 text-sm text-fg">
            {GENERIC}
          </p>
          <Link
            to="/login"
            className="text-sm text-accent underline-offset-4 hover:underline"
          >
            Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-5 space-y-3">
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Sending…" : "Send reset link"}
          </Button>
          <p className="text-sm text-muted">
            <Link
              to="/login"
              className="text-accent underline-offset-4 hover:underline"
            >
              Back to sign in
            </Link>
          </p>
        </form>
      )}
    </main>
  );
}
