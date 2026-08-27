"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function PwaHomeLauncher() {
  const router = useRouter();

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches
      || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

    if (!standalone) return;

    const openHome = () => {
      if (document.visibilityState === "visible" && window.location.pathname !== "/today" && window.location.pathname !== "/login") {
        router.replace("/today");
      }
    };

    openHome();
    document.addEventListener("visibilitychange", openHome);
    return () => document.removeEventListener("visibilitychange", openHome);
  }, [router]);

  return null;
}

