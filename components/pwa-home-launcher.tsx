"use client";

import { useEffect } from "react";

export function PwaHomeLauncher() {
  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches
      || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

    if (!standalone) return;

    const prepareNextLaunch = () => {
      if (document.visibilityState === "hidden" && window.location.pathname !== "/today" && window.location.pathname !== "/login") {
        window.location.replace("/today");
      }
    };

    document.addEventListener("visibilitychange", prepareNextLaunch);
    return () => document.removeEventListener("visibilitychange", prepareNextLaunch);
  }, []);

  return null;
}

