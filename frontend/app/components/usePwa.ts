"use client";

import { useCallback, useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export interface PwaState {
  isOffline: boolean;
  isStandalone: boolean;
  isIOS: boolean;
  canInstallPrompt: boolean;
  swReady: boolean;
  promptInstall: () => Promise<boolean>;
}

export function usePwa(): PwaState {
  const [isOffline, setIsOffline] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [swReady, setSwReady] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- browser-only state, read after hydration
    setIsOffline(!navigator.onLine);

    const iosDetected =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setIsIOS(iosDetected);

    const standaloneQuery = window.matchMedia("(display-mode: standalone)");
    const checkStandalone = () => {
      const navStandalone = Boolean(
        (navigator as Navigator & { standalone?: boolean }).standalone,
      );
      setIsStandalone(standaloneQuery.matches || navStandalone);
    };
    checkStandalone();

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    const handleBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);
    standaloneQuery.addEventListener("change", checkStandalone);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        })
        .then(() => setSwReady(true))
        .catch(() => undefined);
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
      standaloneQuery.removeEventListener("change", checkStandalone);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setDeferredPrompt(null);
      return true;
    }
    return false;
  }, [deferredPrompt]);

  return {
    isOffline,
    isStandalone,
    isIOS,
    canInstallPrompt: deferredPrompt !== null,
    swReady,
    promptInstall,
  };
}
