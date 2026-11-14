import { type ReactNode, Suspense } from "react";
import { TyyniLogo } from "../components/icons";
import { SanctuaryApp } from "../components/SanctuaryApp";
import { getDashboard } from "../lib/dashboard";

/**
 * Shared by every tab. Holds the app state (in SanctuaryApp), so moving
 * between tabs is a client-side navigation that keeps it, while each tab's
 * page loads only its own screen's code.
 */
export default function SanctuaryLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<SanctuarySplash />}>
      <SanctuaryWithData>{children}</SanctuaryWithData>
    </Suspense>
  );
}

/** Reads today's data on the server, then hands it to the app. */
async function SanctuaryWithData({ children }: { children: ReactNode }) {
  const { dashboard } = await getDashboard();
  return <SanctuaryApp dashboard={dashboard}>{children}</SanctuaryApp>;
}

/** Part of the prerendered shell; shows until the app streams in. */
function SanctuarySplash() {
  return (
    <div
      className="relative mx-auto flex min-h-dvh w-full max-w-[430px] flex-col items-center justify-center bg-surface md:shadow-[0_0_60px_-12px_rgba(34,72,64,0.14),0_0_0_1px_rgba(113,121,118,0.14)]"
      aria-busy="true"
    >
      <TyyniLogo size={56} />
    </div>
  );
}
