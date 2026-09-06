import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { authClient, authEnabled, signOut } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getTurnstileSiteKey, verifyTurnstile } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { toast } from "sonner";

export const Route = createFileRoute("/signup")({ component: Signup });

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
        },
      ) => string;
      reset: (widgetId?: string) => void;
    };
    onTurnstileApiLoad?: () => void;
  }
}

function Signup() {
  const { user, isPending } = useCurrentUserState();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(false);
  const [siteKey, setSiteKey] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState("");
  const widgetHost = useRef<HTMLDivElement | null>(null);
  const widgetId = useRef<string | null>(null);

  if (!isPending && user && !created) {
    void navigate({ to: "/" });
  }

  useEffect(() => {
    void getTurnstileSiteKey()
      .then((r) => setSiteKey(r.siteKey))
      .catch(() => setSiteKey(""));
  }, []);

  useEffect(() => {
    if (!siteKey || !widgetHost.current) return;

    function mount() {
      if (!window.turnstile || !widgetHost.current || !siteKey) return;
      if (widgetId.current) return;
      widgetId.current = window.turnstile.render(widgetHost.current, {
        sitekey: siteKey,
        callback: (token) => setTurnstileToken(token),
        "expired-callback": () => setTurnstileToken(""),
        "error-callback": () => setTurnstileToken(""),
      });
    }

    if (window.turnstile) {
      mount();
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://challenges.cloudflare.com/turnstile/v0/api.js"]',
    );
    if (existing) {
      window.onTurnstileApiLoad = mount;
      return;
    }

    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileApiLoad&render=explicit";
    script.async = true;
    window.onTurnstileApiLoad = mount;
    document.head.appendChild(script);
  }, [siteKey]);

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
    if (!turnstileToken) {
      toast.error("Complete the security check before creating an account.");
      return;
    }
    setBusy(true);
    try {
      await verifyTurnstile({ data: { token: turnstileToken } });
    } catch (err) {
      setBusy(false);
      setTurnstileToken("");
      if (widgetId.current && window.turnstile) window.turnstile.reset(widgetId.current);
      toast.error(err instanceof Error ? err.message : "Security check failed.");
      return;
    }

    const { error } = await authClient.signUp.email({
      email,
      password,
      name: email.split("@")[0] ?? "Member",
    });
    if (error) {
      setBusy(false);
      setTurnstileToken("");
      if (widgetId.current && window.turnstile) window.turnstile.reset(widgetId.current);
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
      <h1 className="mt-3 font-display text-4xl tracking-tight">Create account</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Private access. One account per email. After you sign in, confirm the two research statements
        to enter the shop.
      </p>
      {!authEnabled ? (
        <p className="mt-8 text-sm text-muted">Sign-up is closed right now.</p>
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
          {siteKey ? (
            <div ref={widgetHost} className="cf-turnstile" />
          ) : siteKey === "" ? (
            <p className="text-sm text-muted">
              Security check is not configured. Set TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY on
              the server.
            </p>
          ) : (
            <p className="text-xs text-muted">Loading security check…</p>
          )}
          <Button
            type="submit"
            className="w-full"
            disabled={busy || !siteKey || !turnstileToken}
          >
            {busy ? "Creating…" : "Create account"}
          </Button>
        </form>
      )}
      <p className="mt-6 text-sm text-muted">
        Already have an account?{" "}
        <Link to="/login" className="text-accent underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </main>
  );
}
