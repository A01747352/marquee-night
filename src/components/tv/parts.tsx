"use client";

import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { formatDelta, type Media, type Team, type TileResult, type TimerView } from "@/lib/game";
import { useCountdown } from "@/lib/useCountdown";

export function Wordmark({ size = 44, className = "" }: { size?: number; className?: string }) {
  return (
    <div
      className={`font-display font-black uppercase leading-[0.85] tracking-[0.04em] text-glow-gold ${className}`}
      style={{ fontSize: size }}
    >
      Marquee Night
    </div>
  );
}

export function Eyebrow({
  children,
  className = "",
  tone = "text-text-dim",
  size = 22,
}: {
  children: ReactNode;
  className?: string;
  /** A Tailwind text-color class. */
  tone?: string;
  size?: number;
}) {
  return (
    <div className={`font-mono uppercase tracking-[0.24em] ${tone} ${className}`} style={{ fontSize: size }}>
      {children}
    </div>
  );
}

export function TeamDot({ color, size = 20 }: { color: string; size?: number }) {
  return (
    <span
      className="inline-block shrink-0 rounded-full"
      style={{ width: size, height: size, background: color, boxShadow: `0 0 ${size}px ${color}88` }}
    />
  );
}

/** Circular countdown (160px, 12px stroke, gold progress on a navy track). */
export function TimerRing({ timer, size = 160 }: { timer: TimerView; size?: number }) {
  const remaining = useCountdown(timer);
  const stroke = 12;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const progress = timer.durationMs ? remaining / timer.durationMs : 0;
  const seconds = Math.ceil(remaining / 1000);
  const urgent = seconds <= 5;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#18286e" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={urgent ? "var(--color-wrong-soft)" : "var(--color-gold)"}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          style={{ transition: "stroke-dashoffset 100ms linear, stroke 300ms" }}
        />
      </svg>
      <div
        className={`absolute inset-0 flex items-center justify-center font-display font-black ${urgent ? "text-wrong-soft" : "text-text"}`}
        style={{ fontSize: size * 0.4 }}
      >
        {seconds}
      </div>
      {!timer.running && remaining > 0 && (
        <div className="absolute -bottom-10 left-0 right-0 text-center font-mono text-[18px] tracking-[0.24em] text-text-dim">
          PAUSED
        </div>
      )}
    </div>
  );
}

/**
 * Text that starts at `max` px and shrinks in `step`s until it fits its box,
 * never going below `min`. The box must have a definite height.
 */
export function FitText({
  children,
  max,
  min,
  step = 4,
  className = "",
  style,
}: {
  children: ReactNode;
  max: number;
  min: number;
  step?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(max);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    let s = max;
    el.style.fontSize = `${s}px`;
    while (s > min && (el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1)) {
      s = Math.max(min, s - step);
      el.style.fontSize = `${s}px`;
    }
    setSize(s);
  }, [children, max, min, step]);

  return (
    <div ref={ref} className={`overflow-hidden ${className}`} style={{ ...style, fontSize: size }}>
      {children}
    </div>
  );
}

/** Image or audio for a question (560px block on the TV). */
export function MediaBlock({ media, width = 560 }: { media: Media; width?: number }) {
  if (media.type === "image") {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- data: URIs and arbitrary hosts
      <img
        src={media.src}
        alt=""
        className="max-h-[640px] rounded-[20px] border-2 border-panel-border object-contain shadow-[0_0_60px_rgba(53,105,255,0.35)]"
        style={{ width }}
      />
    );
  }
  return (
    <div
      className="flex flex-col items-center justify-center gap-8 rounded-[20px] border-2 border-panel-border bg-panel p-10"
      style={{ width, height: 360 }}
    >
      <div className="flex h-[120px] items-end gap-3">
        {[0.4, 0.8, 0.55, 1, 0.7, 0.45, 0.9, 0.6].map((h, i) => (
          <span
            key={i}
            className="w-5 origin-bottom animate-pulse rounded-full bg-gold"
            style={{ height: `${h * 100}%`, animationDelay: `${i * 120}ms` }}
          />
        ))}
      </div>
      <audio src={media.src} controls autoPlay className="w-full" />
    </div>
  );
}

export function ResultChip({ result, team }: { result: TileResult; team: Team }) {
  const gain = result.delta > 0;
  const loss = result.delta < 0;
  const border = gain ? "border-correct" : loss ? "border-wrong" : "border-panel-border";
  const glow = gain
    ? "shadow-[0_0_40px_rgba(47,191,91,0.45)]"
    : loss
      ? "shadow-[0_0_30px_rgba(229,72,77,0.3)]"
      : "";
  return (
    <div className={`flex items-center gap-6 rounded-[18px] border-[3px] bg-panel px-9 py-5 ${border} ${glow}`}>
      <TeamDot color={team.color} size={24} />
      <div className="flex flex-col">
        {result.steal && (
          <span className="font-mono text-[18px] tracking-[0.24em] text-steal">
            {result.delta === 0 ? "STEAL · NO PENALTY" : "STEAL"}
          </span>
        )}
        <span className="text-[34px] font-semibold">{team.name}</span>
      </div>
      <span
        className={`font-display text-[64px] font-black ${gain ? "text-correct-soft" : loss ? "text-wrong-soft" : "text-text-dim"}`}
      >
        {formatDelta(result.delta)}
      </span>
    </div>
  );
}
