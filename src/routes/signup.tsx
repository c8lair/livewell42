import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { authClient, authEnabled, signOut } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { toast } from "sonner";

export const Route = createFileRoute("/signup")({ component: Signup });

function Signup() {
  const { user, isPending } = useCurrentUserState();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(false);

  if (!isPending && user && !created) {
    void navigate({ to: "/" });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.trim() !== confirm.trim()) {
      toast.error("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      toast.error("Use at least 8 characters.");
      return;
    }
    setBusy(true);
    const { error } = await authClient.signUp.email({
      email,
      password,
      name: email.split("@")[0] ?? "Member",
    });
    if (error) {
      setBusy(false);
      toast.error(error.message ?? "Could not create the account.");
      return;
    }
    setCreated(true);
    try {
      await signOut();
    } catch {
      /* login still requires the two legal boxes */
    }
    setBusy(false);
    toast.success("Account created. Sign in to continue.");
    window.location.assign("/login");
  }

  return (
    <main className="mx-auto max-w-md px-6 py-10">
      <p className="font-display text-sm tracking-[0.28em] text-muted uppercase">Livewell42</p>
      <h1 className="mt-3 font-display text-4xl tracking-tight">Request membership</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Private access. One account per email. A one-time $5 membership keeps automated sign-ups
        out. That $5 is credited on your first order.
      </p>
      {!authEnabled ? (
        <p className="mt-8 text-sm text-muted">Membership is closed right now.</p>
      ) : (
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
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
              {showPassword ? "Hide passwords" : "Show passwords"}
            </button>
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Creating…" : "Create account"}
          </Button>
        </form>
      )}
      <p className="mt-6 text-sm text-muted">
        Already a member?{" "}
        <Link to="/login" className="text-accent underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </main>
  );
}
