"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";
import type { PublicView } from "@/lib/game";
import { Eyebrow, TeamDot, Wordmark } from "./parts";

export function Lobby({
  view,
  roomCode,
  joinUrl,
  hostConnected,
  localOnly,
}: {
  view: PublicView;
  roomCode: string;
  joinUrl: string;
  hostConnected: boolean;
  localOnly: boolean;
}) {
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    QRCode.toDataURL(joinUrl, {
      width: 680,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#050818", light: "#eef1ff" },
    }).then(setQr, () => setQr(null));
  }, [joinUrl]);

  const displayUrl = joinUrl.replace(/^https?:\/\//, "").replace(/\?.*$/, "");

  return (
    <div className="bg-board-glow flex h-full items-center gap-[100px] px-[120px]">
      <div className="flex min-w-0 flex-1 flex-col">
        <Wordmark size={180} />
        <div className="mt-8 text-[48px] font-semibold text-text-muted">{view.title}</div>

        <Eyebrow className="mt-[90px]">Teams · Turn order</Eyebrow>
        <div className="mt-6 flex flex-wrap gap-4">
          {view.teams.map((t, i) => (
            <div
              key={t.id}
              className="flex items-center gap-4 rounded-full border-2 border-panel-border bg-panel py-4 pr-9 pl-6"
            >
              <span className="font-mono text-[20px] text-text-dim">{i + 1}</span>
              <TeamDot color={t.color} size={22} />
              <span className="text-[34px] font-semibold">{t.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex w-[560px] shrink-0 flex-col items-center rounded-[20px] border-2 border-panel-border bg-panel px-12 py-14">
        <div className="flex h-[340px] w-[340px] items-center justify-center overflow-hidden rounded-[14px] bg-text">
          {/* eslint-disable-next-line @next/next/no-img-element -- generated data: URI */}
          {qr && <img src={qr} alt={`QR code for ${joinUrl}`} className="h-full w-full" />}
        </div>
        <Eyebrow className="mt-10" tone="text-text-muted">Host, scan or enter</Eyebrow>
        <div className="mt-2 font-display text-[132px] font-black leading-none tracking-[0.12em] text-glow-gold">
          {roomCode}
        </div>
        <div className="mt-4 font-mono text-[22px] tracking-[0.1em] text-text-dim">{displayUrl}</div>
        <div
          className={`mt-8 flex items-center gap-3 rounded-full px-6 py-2 font-mono text-[20px] tracking-[0.16em] ${hostConnected ? "bg-correct/15 text-correct-soft" : "bg-bg/60 text-text-dim"}`}
        >
          <span className={`h-3 w-3 rounded-full ${hostConnected ? "bg-correct-soft" : "animate-pulse bg-text-dim"}`} />
          {hostConnected ? "HOST CONNECTED" : "WAITING FOR HOST"}
        </div>
        {localOnly && (
          <div className="mt-4 max-w-[440px] text-center text-[18px] leading-snug text-gold">
            Realtime isn&apos;t configured, so only another tab in this browser can be the remote. Add the
            Supabase keys to pair a phone.
          </div>
        )}
      </div>
    </div>
  );
}
