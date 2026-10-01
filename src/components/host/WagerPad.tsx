"use client";

import { useState } from "react";
import { BigButton, Eyebrow } from "./ui";

/** 1l · numeric keypad for bonus and final-round wagers. */
export function WagerPad({
  title,
  teamName,
  max,
  initial,
  disabled,
  onLock,
  onCancel,
}: {
  title: string;
  teamName: string;
  max: number;
  initial?: number | null;
  disabled?: boolean;
  onLock: (amount: number) => void;
  onCancel?: () => void;
}) {
  const [digits, setDigits] = useState(initial != null ? String(initial) : "");
  const amount = digits === "" ? 0 : Number(digits);
  const tooHigh = amount > max;

  const press = (key: string) => {
    navigator.vibrate?.(8);
    if (key === "⌫") setDigits((d) => d.slice(0, -1));
    else if (key === "Max") setDigits(String(max));
    else setDigits((d) => (d === "0" ? key : (d + key).slice(0, 6)));
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Eyebrow tone="text-gold">{title}</Eyebrow>
        <div className="mt-1 text-[22px] font-semibold">{teamName} wager</div>
      </div>

      <div
        className={`flex h-[88px] items-center justify-center rounded-[16px] border-[3px] bg-panel font-display text-[56px] font-black tabular-nums ${tooHigh ? "border-wrong text-wrong-soft" : "border-gold text-gold"}`}
      >
        {digits === "" ? <span className="text-text-dim">0</span> : amount.toLocaleString("en-US")}
      </div>
      <div className={`text-center text-[14px] ${tooHigh ? "text-wrong-soft" : "text-text-muted"}`}>
        {tooHigh ? `That's more than ${max}.` : `Anything from 0 to ${max.toLocaleString("en-US")}`}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "Max", "0", "⌫"].map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => press(k)}
            aria-label={k === "⌫" ? "Delete" : k}
            className={`h-[60px] rounded-[14px] font-display text-[28px] font-black ring-2 ring-panel-border active:brightness-125 ${k === "Max" ? "bg-[#2a3366] text-gold" : "bg-panel"}`}
          >
            {k}
          </button>
        ))}
      </div>

      <BigButton tone="gold" size="lg" disabled={disabled || tooHigh} onClick={() => onLock(amount)}>
        Lock wager
      </BigButton>
      {onCancel && (
        <button type="button" onClick={onCancel} className="h-11 text-[15px] font-semibold text-text-muted">
          Back
        </button>
      )}
    </div>
  );
}
