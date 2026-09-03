import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { acceptLegal } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { CheckRow, Input, Label } from "@/components/ui/field";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const { user, isPending } = useCurrentUserState();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [over21, setOver21] = useState(false);
  const [research, setResearch] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!isPending && user) {
    void navigate({ to: "/" });
  }

  const legalOk = over21 && research;

  async function afterAuth() {
    try {
      await acceptLegal();
    } catch {
      /* shop will still require the same two boxes if this misses */
    }
    void navigate({ to: "/" });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!legalOk) {
      toast.error("Confirm both statements to sign in.");
      return;
    }
    setBusy(true);
    const { error } = await authClient.signIn.email({ email, password });
    setBusy(false);
    if (error) {
      toast.error(error.message ?? "Sign-in failed.");
      return;
    }
    await afterAuth();
  }

  async function social(id: string) {
    if (!legalOk) {
      toast.error("Confirm both statements before continuing.");
      return;
    }
    setBusy(true);
    try {
      await signIn(id, { callbackURL: "/" });
      await afterAuth();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign-in failed.");
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-6 py-8">
      <p className="font-display text-sm tracking-[0.28em] text-muted uppercase">Livewell42</p>
      <h1 className="mt-2 font-display text-3xl tracking-tight">Sign in</h1>
      <p className="mt-1 text-sm text-muted">Members only. One email, one account.</p>

      {!authEnabled ? (
        <p className="mt-8 text-sm text-muted">Sign-in is disabled.</p>
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
          <div>
            <Label>Password</Label>
            <Input
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="mt-1 text-xs text-gray-400 underline-offset-4 hover:underline"
              onClick={() => setShowPassword((v) => !v)}
            >
              {showPassword ? "Hide password" : "Show password"}
            </button>
          </div>

          <div className="space-y-1 rounded-lg border border-border bg-surface px-3 py-2">
            <p className="text-xs tracking-wide text-faint uppercase">Required to sign in</p>
            <CheckRow checked={over21} onChange={setOver21}>
              I confirm that I am 21 years of age or older.
            </CheckRow>
            <CheckRow checked={research} onChange={setResearch}>
              I understand that all products are for laboratory research use only
              and are not for human consumption.
            </CheckRow>
          </div>

          <Button type="submit" className="w-full" disabled={busy || !legalOk}>
            {busy ? "Signing in…" : "Sign in"}
          </Button>

          <div className="flex items-center gap-3 text-xs tracking-wide text-faint uppercase">
            <span className="h-px flex-1 bg-border" />
            or
            <span className="h-px flex-1 bg-border" />
          </div>

          {GROK_PROVIDERS.map((p) => (
            <Button
              key={p.providerId}
              type="button"
              variant="outline"
              className="w-full"
              disabled={busy || !legalOk}
              onClick={() => void social(p.providerId)}
            >
              Continue with {p.label}
            </Button>
          ))}
        </form>
      )}

      <p className="mt-5 text-sm text-muted">
        No account yet?{" "}
        <Link to="/signup" className="text-accent underline-offset-4 hover:underline">
          Request membership
        </Link>
      </p>
    </main>
  );
}
