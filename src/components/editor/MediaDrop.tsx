"use client";

import { useRef, useState } from "react";
import type { Media } from "@/lib/game";
import { dataUriBytes, fileToMedia, formatBytes } from "@/lib/media";

/** Striped dropzone for a question's image or audio, with URL paste as an alternative. */
export function MediaDrop({ media, onChange }: { media?: Media; onChange: (media: Media | undefined) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const [url, setUrl] = useState("");

  const take = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const result = await fileToMedia(file);
      onChange(result.media);
      setNote(result.note);
    } catch (e) {
      setError(e instanceof Error ? e.message : "That file couldn't be used.");
    } finally {
      setBusy(false);
    }
  };

  const addUrl = () => {
    const src = url.trim();
    if (!/^https?:\/\//i.test(src)) {
      setError("Paste a link starting with http:// or https://");
      return;
    }
    const type = /\.(mp3|wav|ogg|m4a|aac|flac)(\?|#|$)/i.test(src) ? "audio" : "image";
    onChange({ type, src });
    setNote(`Linked ${type} · needs internet on game night`);
    setError(null);
    setUrl("");
  };

  if (media) {
    const bytes = dataUriBytes(media.src);
    return (
      <div className="flex flex-col gap-2 rounded-[12px] bg-bg p-3 ring-1 ring-panel-border">
        {media.type === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element -- data: URIs and arbitrary hosts
          <img src={media.src} alt="" className="max-h-[180px] w-full rounded-lg object-contain" />
        ) : (
          <audio src={media.src} controls className="w-full" />
        )}
        <div className="flex items-center justify-between gap-2 text-[12px] text-text-muted">
          <span className="truncate">
            {note ?? (bytes ? `${media.type === "image" ? "Image" : "Audio"} · ${formatBytes(bytes)}` : `Linked ${media.type}`)}
          </span>
          <button
            type="button"
            onClick={() => {
              onChange(undefined);
              setNote(null);
            }}
            className="shrink-0 rounded-md px-2 py-1 font-semibold text-wrong-soft hover:bg-wrong/15"
          >
            Remove
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          take(e.dataTransfer.files[0]);
        }}
        className={`flex h-[110px] flex-col items-center justify-center gap-1 rounded-[12px] border-2 border-dashed text-[13px] transition ${over ? "border-gold text-gold" : "border-panel-border text-text-muted hover:border-cat-border"}`}
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, rgba(29,43,107,0.35) 0 10px, transparent 10px 20px)",
        }}
      >
        {busy ? (
          <span>Compressing…</span>
        ) : (
          <>
            <span className="font-semibold text-text">Drop image or audio</span>
            <span>compressed to ~500 KB · or click to choose</span>
          </>
        )}
      </button>
      <input
        ref={input}
        type="file"
        accept="image/*,audio/*"
        className="hidden"
        onChange={(e) => {
          take(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <div className="flex gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addUrl())}
          placeholder="…or paste an image/audio URL"
          className="min-w-0 flex-1 rounded-lg bg-bg px-3 py-2 text-[13px] outline-none ring-1 ring-panel-border focus:ring-cat-border"
        />
        <button
          type="button"
          onClick={addUrl}
          disabled={!url.trim()}
          className="rounded-lg bg-panel px-3 text-[13px] font-semibold ring-1 ring-panel-border disabled:opacity-40"
        >
          Add
        </button>
      </div>
      {error && <p className="text-[12px] text-wrong-soft">{error}</p>}
    </div>
  );
}
