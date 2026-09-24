import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { CashAppBtcExplainer } from "@/components/shop/cashapp-btc-explainer";
import { FaqAccordion } from "@/components/shop/faq-accordion";

export const Route = createFileRoute("/faq")({ component: FaqPage });

function FaqPage() {
  const { user, isPending } = useCurrentUserState();
  const [explainerOpen, setExplainerOpen] = useState(false);

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-4">
          <Link to="/" className="font-display text-xl tracking-tight">
            Livewell42
          </Link>
          <span className="text-sm text-muted">Help</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          {isPending ? null : user ? (
            <>
              <Link to="/" className="text-muted hover:text-fg">
                Shop
              </Link>
              <Link to="/orders" className="text-muted hover:text-fg">
                Orders
              </Link>
              <UserButton />
            </>
          ) : (
            <Link to="/login" className="text-muted hover:text-fg">
              Sign in
            </Link>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 pb-20">
        <h1 className="font-display text-[28px] font-medium">Help &amp; FAQ</h1>
        <p className="mt-1.5 mb-6 text-sm text-muted">
          Click a question to expand. Bitcoin / Cash App entries link to the walkthrough.
        </p>
        <FaqAccordion onWatchGif={() => setExplainerOpen(true)} />
      </main>

      <CashAppBtcExplainer open={explainerOpen} onOpenChange={setExplainerOpen} />
    </div>
  );
}
