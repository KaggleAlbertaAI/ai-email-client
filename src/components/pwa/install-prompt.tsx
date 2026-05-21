"use client";

import { useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * PWA install prompt component
 *
 * Only shows when all of the following conditions are met:
 * 1. Browser supports the beforeinstallprompt event
 * 2. PWA is not already installed
 * 3. User has not dismissed the install prompt
 */
export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // Listen for app installed event
    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setShowPrompt(false);
    });

    // Capture beforeinstallprompt event
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // Auto-show prompt after 7 seconds (give browser time to determine if installable)
    const timer = setTimeout(() => {
      if (deferredPrompt && !isInstalled) {
        setShowPrompt(true);
      }
    }, 7000);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      clearTimeout(timer);
    };
  }, [deferredPrompt, isInstalled]);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setShowPrompt(false);
    // Dismiss for 30 days
    localStorage.setItem("pwa-install-dismissed", String(Date.now()));
  }, []);

  // Don't show if already installed or browser doesn't support PWA
  if (isInstalled || !showPrompt) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-md p-4 transition-all duration-300",
        showPrompt ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
      )}
      role="dialog"
      aria-label="Install App"
    >
      <div className="rounded-2xl border bg-card p-5 shadow-xl">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary">
            <svg className="h-5 w-5 text-primary-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="M22 4L12 13 2 4" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold">Install to Home Screen</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Add AI Mail to your home screen for quick access anytime. Supports offline reading of cached emails.
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="rounded-md p-1 transition-colors hover:bg-muted"
            aria-label="Close"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={handleInstall}
            className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Install
          </button>
          <button
            onClick={handleDismiss}
            className="flex-1 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
          >
            Not Now
          </button>
        </div>
      </div>
    </div>
  );
}
