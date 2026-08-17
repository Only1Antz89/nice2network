"use client";

import dynamic from "next/dynamic";
import { Clock3, Flag, Lightbulb, PawPrint, Plane, Shapes, Smile, Trophy, Utensils } from "lucide-react";
import { Categories, EmojiStyle, SkinTonePickerLocation, SkinTones, SuggestionMode, Theme, type CategoryIcons, type EmojiClickData } from "emoji-picker-react";
import { useEffect, useRef, useState } from "react";
import styles from "./emoji-picker.module.css";

const FullEmojiPicker = dynamic(() => import("emoji-picker-react"), { ssr: false });
const SKIN_TONE_KEY = "n2-emoji-skin-tone";
const CATEGORY_ICON_SIZE = 18;
const categoryIcons: CategoryIcons = {
  [Categories.SUGGESTED]: <Clock3 aria-hidden="true" size={CATEGORY_ICON_SIZE} />,
  [Categories.SMILEYS_PEOPLE]: <Smile aria-hidden="true" size={CATEGORY_ICON_SIZE} />,
  [Categories.ANIMALS_NATURE]: <PawPrint aria-hidden="true" size={CATEGORY_ICON_SIZE} />,
  [Categories.FOOD_DRINK]: <Utensils aria-hidden="true" size={CATEGORY_ICON_SIZE} />,
  [Categories.TRAVEL_PLACES]: <Plane aria-hidden="true" size={CATEGORY_ICON_SIZE} />,
  [Categories.ACTIVITIES]: <Trophy aria-hidden="true" size={CATEGORY_ICON_SIZE} />,
  [Categories.OBJECTS]: <Lightbulb aria-hidden="true" size={CATEGORY_ICON_SIZE} />,
  [Categories.SYMBOLS]: <Shapes aria-hidden="true" size={CATEGORY_ICON_SIZE} />,
  [Categories.FLAGS]: <Flag aria-hidden="true" size={CATEGORY_ICON_SIZE} />,
};

function savedSkinTone(): SkinTones {
  if (typeof window === "undefined") return SkinTones.NEUTRAL;
  const saved = window.localStorage.getItem(SKIN_TONE_KEY);
  return Object.values(SkinTones).includes(saved as SkinTones) ? saved as SkinTones : SkinTones.NEUTRAL;
}

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

  function choose(data: EmojiClickData) {
    onSelect(data.emoji);
    setOpen(false);
  }

  function changeSkinTone(next: SkinTones) {
    window.localStorage.setItem(SKIN_TONE_KEY, next);
  }

  return <div className={`emoji-picker ${align} ${styles.root}`} ref={root}>
    <button type="button" className={`emoji-trigger ${styles.trigger}`} aria-label="Add emoji" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(value => !value)}><Smile aria-hidden="true" size={17}/></button>
    {open && <div className={`emoji-popover ${styles.popover}`} role="dialog" aria-label="Choose an emoji">
      <FullEmojiPicker
        className={styles.panel}
        onEmojiClick={choose}
        onSkinToneChange={changeSkinTone}
        defaultSkinTone={savedSkinTone()}
        skinTonePickerLocation={SkinTonePickerLocation.SEARCH}
        emojiStyle={EmojiStyle.NATIVE}
        theme={Theme.AUTO}
        categoryIcons={categoryIcons}
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
