"use client";

import dynamic from "next/dynamic";
import { Clock3, Flag, Lightbulb, PawPrint, Plane, Shapes, Smile, Trophy, Utensils } from "lucide-react";
import { Categories, EmojiStyle, SkinTonePickerLocation, SkinTones, SuggestionMode, Theme, type CategoryIcons, type EmojiClickData } from "emoji-picker-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  const trigger = useRef<HTMLButtonElement>(null);
  const popover = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState({ top: 0, left: 0, width: 350, height: 410, ready: false });

  const positionPopover = useCallback(() => {
    const anchor = trigger.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const gutter = 12, gap = 9;
    const width = Math.min(350, window.innerWidth - gutter * 2);
    const spaceAbove = rect.top - gutter - gap;
    const spaceBelow = window.innerHeight - rect.bottom - gutter - gap;
    const placeAbove = spaceAbove >= Math.min(410, spaceBelow) || spaceAbove > spaceBelow;
    const available = Math.max(160, placeAbove ? spaceAbove : spaceBelow);
    const height = Math.min(410, available);
    const preferredLeft = align === "right" ? rect.right - width : rect.left;
    const left = Math.max(gutter, Math.min(preferredLeft, window.innerWidth - width - gutter));
    const preferredTop = placeAbove ? rect.top - gap - height : rect.bottom + gap;
    const top = Math.max(gutter, Math.min(preferredTop, window.innerHeight - height - gutter));
    setLayout({ top, left, width, height, ready: true });
  }, [align]);

  useLayoutEffect(() => {
    if (!open) return;
    positionPopover();
  }, [open, positionPopover]);

  useEffect(() => {
    if (!open) return;
    function close(event: PointerEvent) {
      const target = event.target as Node;
      if (!root.current?.contains(target) && !popover.current?.contains(target)) setOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    function reposition() {
      positionPopover();
    }
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open, positionPopover]);

  function choose(data: EmojiClickData) {
    onSelect(data.emoji);
    setOpen(false);
  }

  function changeSkinTone(next: SkinTones) {
    window.localStorage.setItem(SKIN_TONE_KEY, next);
  }

  const picker = open && typeof document !== "undefined" ? createPortal(
    <div
      ref={popover}
      className={`emoji-popover emoji-floating ${styles.popover}`}
      role="dialog"
      aria-label="Choose an emoji"
      style={{ position: "fixed", top: layout.top, left: layout.left, right: "auto", bottom: "auto", width: layout.width, height: layout.height, visibility: layout.ready ? "visible" : "hidden" }}
    >
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
        height={Math.max(144, layout.height - 16)}
        lazyLoadEmojis
      />
    </div>,
    document.body,
  ) : null;

  return <div className={`emoji-picker ${align} ${styles.root}`} ref={root}>
    <button ref={trigger} type="button" className={`emoji-trigger ${styles.trigger}`} aria-label="Add emoji" aria-haspopup="dialog" aria-expanded={open} onClick={() => { setLayout(current => ({ ...current, ready: false })); setOpen(value => !value); }}><Smile aria-hidden="true" size={17}/></button>
    {picker}
  </div>;
}
