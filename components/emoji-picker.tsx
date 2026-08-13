"use client";

import { Smile } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const EMOJI = [
  "😀", "😂", "😊", "😍", "🤝", "👋", "👍", "🙌",
  "❤️", "🔥", "✨", "🎉", "💡", "👀", "✅", "🚀",
  "🌍", "💬", "📌", "🔖", "🛠️", "🎯", "📅", "💼",
  "🧠", "🌱", "⚡", "🎨", "📣", "🧩", "👏", "🙏",
];

export default function EmojiPicker({ onSelect, align = "left" }: { onSelect: (emoji: string) => void; align?: "left" | "right" }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function close(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  return <div className={`emoji-picker ${align}`} ref={root}>
    <button type="button" className="emoji-trigger" aria-label="Add emoji" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(value => !value)}><Smile size={17}/></button>
    {open && <div className="emoji-popover" role="dialog" aria-label="Choose an emoji">
      <span>EMOJI</span>
      <div>{EMOJI.map((emoji, index) => <button type="button" className="emoji-glyph" aria-label={`Insert ${emoji}`} key={`${emoji}-${index}`} onClick={() => { onSelect(emoji); setOpen(false); }}>{emoji}</button>)}</div>
    </div>}
  </div>;
}
