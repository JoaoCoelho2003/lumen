"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface UseInstallPromptReturn {
  isInstallable: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  triggerInstall: () => Promise<void>;
  dismissPrompt: () => void;
  isDismissed: boolean;
}

const DISMISS_KEY = "lumen_pwa_prompt_dismissed";
const DISMISS_EXPIRY_DAYS = 7;

export function useInstallPrompt(): UseInstallPromptReturn {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if already installed (standalone mode)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in window.navigator &&
        (window.navigator as { standalone?: boolean }).standalone === true);

    const syncPromptState = window.setTimeout(() => {
      if (isStandalone) {
        setIsInstalled(true);
        return;
      }

      // Detect iOS
      const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
      setIsIOS(ios);

      // Check if dismissed recently
      const dismissedAt = localStorage.getItem(DISMISS_KEY);
      if (dismissedAt) {
        const expiry = new Date(dismissedAt);
        expiry.setDate(expiry.getDate() + DISMISS_EXPIRY_DAYS);
        if (new Date() < expiry) {
          setIsDismissed(true);
        } else {
          localStorage.removeItem(DISMISS_KEY);
        }
      }
    }, 0);

    // Listen for Chrome/Android install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Listen for successful install
    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.clearTimeout(syncPromptState);
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const triggerInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const dismissPrompt = () => {
    localStorage.setItem(DISMISS_KEY, new Date().toISOString());
    setIsDismissed(true);
  };

  const isInstallable =
    !isInstalled && !isDismissed && (!!deferredPrompt || isIOS);

  return {
    isInstallable,
    isInstalled,
    isIOS,
    triggerInstall,
    dismissPrompt,
    isDismissed,
  };
}
