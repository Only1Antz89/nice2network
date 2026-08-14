"use client";

import dynamic from "next/dynamic";
import { Smile } from "lucide-react";
import { EmojiStyle, SkinTonePickerLocation, SkinTones, SuggestionMode, Theme, type EmojiClickData } from "emoji-picker-react";
import { useEffect, useRef, useState } from "react";

const FullEmojiPicker = dynamic(() => import("emoji-picker-react"), { ssr: false });
const SKIN_TONE_KEY = "n2-emoji-skin-tone";

function savedSkinTone(): SkinTones {
  if (typeof window === "undefined") return SkinTones.NEUTRAL;
  const saved = window.localStorage.getItem(SKIN_TONE_KEY);
  return Object.values(SkinTones).includes(saved as SkinTones) ? saved as SkinTones : SkinTones.NEUTRAL;
}

export default function EmojiPicker({ onSelect, align = "left" }: { onSelect: (emoji: string) => void; align?: "left" | "right" }) {
  const [open, setOpen] = useState(false);
  const [skinTone, setSkinTone] = useState<SkinTones>(SkinTones.NEUTRAL);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => setSkinTone(savedSkinTone()), []);
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

  function choose(data: EmojiClickData) {
    onSelect(data.emoji);
    setOpen(false);
  }

  function changeSkinTone(next: SkinTones) {
    setSkinTone(next);
    window.localStorage.setItem(SKIN_TONE_KEY, next);
  }

  return <div className={`emoji-picker ${align}`} ref={root}>
    <button type="button" className="emoji-trigger" aria-label="Add emoji" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(value => !value)}><Smile size={17}/></button>
    {open && <div className="emoji-popover" role="dialog" aria-label="Choose an emoji">
      <FullEmojiPicker
        onEmojiClick={choose}
        onSkinToneChange={changeSkinTone}
        defaultSkinTone={skinTone}
        skinTonePickerLocation={SkinTonePickerLocation.SEARCH}
        emojiStyle={EmojiStyle.NATIVE}
        theme={Theme.LIGHT}
        searchPlaceHolder="Search emojis"
        suggestedEmojisMode={SuggestionMode.RECENT}
        previewConfig={{ showPreview: false }}
        width="100%"
        height={410}
        lazyLoadEmojis
      />
    </div>}
  </div>;
}
