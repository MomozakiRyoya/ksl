"use client";

import { useEffect, useState } from "react";

export default function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const shown = sessionStorage.getItem("ksl-splash-shown");
    if (shown) {
      setVisible(false);
      return;
    }

    const fadeTimer = setTimeout(() => setFadeOut(true), 2000);
    const hideTimer = setTimeout(() => {
      setVisible(false);
      sessionStorage.setItem("ksl-splash-shown", "1");
    }, 2600);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-opacity duration-600 ${
        fadeOut ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* ダーク背景 */}
      <div className="absolute inset-0" style={{ background: "#0d0010" }} />

      {/* コンテンツ */}
      <div className="relative flex flex-col items-center gap-8 animate-splash-logo px-12">
        {/* KSL ロゴ */}
        <img
          src="/ksl-logo.png"
          alt="KSL"
          className="w-64 object-contain drop-shadow-2xl"
        />

        {/* ローディングドット */}
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full animate-loading-dot"
            style={{ background: "#ec4899" }}
          />
          <span
            className="w-2 h-2 rounded-full animate-loading-dot animation-delay-200"
            style={{ background: "#ec4899" }}
          />
          <span
            className="w-2 h-2 rounded-full animate-loading-dot animation-delay-400"
            style={{ background: "#ec4899" }}
          />
        </div>
      </div>
    </div>
  );
}
