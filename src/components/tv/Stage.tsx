"use client";

import { useLayoutEffect, useState, type ReactNode } from "react";

export const STAGE_W = 1920;
export const STAGE_H = 1080;

/** Renders children on a fixed 1920×1080 canvas scaled to fit the window, letterboxed on bg. */
export function Stage({ children }: { children: ReactNode }) {
  const [scale, setScale] = useState(0);

  useLayoutEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden bg-bg">
      <div
        className="absolute top-1/2 left-1/2 overflow-hidden"
        style={{
          width: STAGE_W,
          height: STAGE_H,
          transform: `translate(-50%, -50%) scale(${scale})`,
          visibility: scale ? "visible" : "hidden",
        }}
      >
        {children}
      </div>
    </div>
  );
}
