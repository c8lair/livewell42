import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { authClient, authEnabled } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : "",
    error: typeof search.error === "string" ? search.error : "",
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const { token, error: searchError } = Route.useSearch();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  const invalidToken = useMemo(
    () => !token || searchError === "INVALID_TOKEN",
    [token, searchError],
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (invalidToken) {
      toast.error("This reset link is invalid or expired.");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await authClient.resetPassword({
        newPassword: password,
        token,
      });
      if (error) {
        toast.error(error.message ?? "Could not reset password.");
        return;
      }
      toast.success("Password updated. Sign in with your new password.");
      void navigate({ to: "/login" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not reset password.");
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
        Set new password
      </h1>
      <p className="mt-1 text-sm text-muted">
        Choose a new password for your account, then sign in.
      </p>

      {!authEnabled ? (
        <p className="mt-8 text-sm text-muted">Sign-in is disabled.</p>
      ) : invalidToken ? (
        <div className="mt-6 space-y-4">
          <p className="rounded-lg border border-border bg-surface px-4 py-3 text-sm text-fg">
            This reset link is invalid or expired. Request a new one from the
            sign-in page.
          </p>
          <Link
            to="/forgot-password"
            className="text-sm text-accent underline-offset-4 hover:underline"
          >
            Forgot password
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-5 space-y-3">
          <div>
            <Label>New password</Label>
            <Input
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div>
            <Label>Confirm password</Label>
            <Input
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={8}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
            <button
              type="button"
              className="mt-1 text-xs text-gray-400 underline-offset-4 hover:underline"
              onClick={() => setShowPassword((v) => !v)}
            >
              {showPassword ? "Hide password" : "Show password"}
            </button>
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Saving…" : "Update password"}
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
