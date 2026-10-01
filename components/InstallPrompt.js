"use client";
import { useEffect, useState } from "react";

const DISMISS_KEY = "palvoya-install-dismissed";

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [platform, setPlatform] = useState(null); // "android" | "ios"
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
    if (isStandalone) return;

    let dismissed = false;
    try {
      dismissed = localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      dismissed = false;
    }
    if (dismissed) return;

    function handleBeforeInstallPrompt(event) {
      event.preventDefault();
      setDeferredPrompt(event);
      setPlatform("android");
      setShowBanner(true);
    }
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    const ua = window.navigator.userAgent || "";
    const isIOS = /iphone|ipad|ipod/i.test(ua) && !window.MSStream;
    const isIOSSafari = isIOS && /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua);
    if (isIOSSafari) {
      setPlatform("ios");
      setShowBanner(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  function dismiss() {
    setShowBanner(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore storage failures (private browsing, etc.)
    }
  }

  async function install() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setShowBanner(false);
  }

  if (!showBanner) return null;

  return (
    <div className="install-banner" role="dialog" aria-label="Install Palvoya">
      <button type="button" className="install-banner-close" aria-label="Dismiss" onClick={dismiss}>
        ×
      </button>
      {platform === "ios" ? (
        <p>
          <b>Install Palvoya:</b> tap <span className="install-share-icon" aria-hidden="true">⬆</span> Share, then
          "Add to Home Screen."
        </p>
      ) : (
        <>
          <p>
            <b>Install Palvoya</b> for quick access and a faster, full-screen experience.
          </p>
          <button type="button" className="install-banner-button" onClick={install}>
            Install
          </button>
        </>
      )}
    </div>
  );
}
