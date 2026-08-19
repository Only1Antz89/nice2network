"use client";

import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";

export type N2SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export type N2SelectGroup = {
  label: string;
  options: N2SelectOption[];
};

type Props = {
  id?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  options: Array<N2SelectOption | N2SelectGroup>;
  onValueChange?: (value: string) => void;
  onOpen?: () => void;
  onPointerDown?: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  compact?: boolean;
  className?: string;
};

function isGroup(item: N2SelectOption | N2SelectGroup): item is N2SelectGroup {
  return "options" in item;
}

const N2Select = forwardRef<HTMLButtonElement, Props>(function N2Select({
  id,
  name,
  value,
  defaultValue = "",
  options,
  onValueChange,
  onOpen,
  onPointerDown,
  ariaLabel,
  ariaDescribedBy,
  "aria-label": ariaLabelAttribute,
  "aria-describedby": ariaDescribedByAttribute,
  placeholder = "Choose an option",
  disabled = false,
  required = false,
  compact = false,
  className = "",
}, forwardedRef) {
  const generatedId = useId();
  const controlId = id ?? `n2-select-${generatedId}`;
  const listId = `${controlId}-listbox`;
  const internalButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});
  const typeaheadRef = useRef("");
  const typeaheadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedValue = value ?? internalValue;

  useImperativeHandle(forwardedRef, () => internalButtonRef.current!, []);
  useEffect(() => setMounted(true), []);

  const flatOptions = useMemo(
    () => options.flatMap((item) => isGroup(item) ? item.options : [item]),
    [options],
  );
  const selected = flatOptions.find((option) => option.value === selectedValue);

  function positionPanel() {
    const trigger = internalButtonRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const margin = 8;
    const availableBelow = window.innerHeight - rect.bottom - margin;
    const availableAbove = rect.top - margin;
    const maxHeight = Math.max(150, Math.min(360, Math.max(availableBelow, availableAbove) - 6));
    const opensUp = availableBelow < 190 && availableAbove > availableBelow;
    const width = Math.max(rect.width, Math.min(360, window.innerWidth - margin * 2));
    const left = Math.min(Math.max(margin, rect.left), window.innerWidth - width - margin);
    setPanelStyle({
      position: "fixed",
      zIndex: 260,
      left,
      width,
      maxHeight,
      ...(opensUp ? { bottom: window.innerHeight - rect.top + 5 } : { top: rect.bottom + 5 }),
    });
  }

  useLayoutEffect(() => {
    if (!open) return;
    positionPanel();
    const reposition = () => positionPanel();
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open, flatOptions.length]);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!internalButtonRef.current?.contains(target) && !panelRef.current?.contains(target)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  useEffect(() => {
    const form = internalButtonRef.current?.form;
    if (!form || value !== undefined) return;
    const reset = () => {
      setInternalValue(defaultValue);
      setOpen(false);
    };
    form.addEventListener("reset", reset);
    return () => form.removeEventListener("reset", reset);
  }, [defaultValue, value]);

  useEffect(() => () => {
    if (typeaheadTimer.current) clearTimeout(typeaheadTimer.current);
  }, []);

  function firstEnabled(from: number, direction: 1 | -1) {
    if (!flatOptions.length) return -1;
    let index = from;
    for (let attempts = 0; attempts < flatOptions.length; attempts += 1) {
      index = (index + direction + flatOptions.length) % flatOptions.length;
      if (!flatOptions[index]?.disabled) return index;
    }
    return -1;
  }

  function show() {
    if (disabled) return;
    const selectedIndex = flatOptions.findIndex((option) => option.value === selectedValue && !option.disabled);
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : Math.max(0, firstEnabled(-1, 1)));
    setOpen(true);
    onOpen?.();
  }

  function choose(option: N2SelectOption) {
    if (option.disabled) return;
    if (value === undefined) setInternalValue(option.value);
    onValueChange?.(option.value);
    setOpen(false);
    requestAnimationFrame(() => internalButtonRef.current?.focus());
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) show();
      else setActiveIndex((index) => firstEnabled(index, event.key === "ArrowDown" ? 1 : -1));
      return;
    }
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      if (!open) show();
      setActiveIndex(event.key === "Home" ? Math.max(0, firstEnabled(-1, 1)) : Math.max(0, firstEnabled(0, -1)));
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!open) show();
      else if (flatOptions[activeIndex]) choose(flatOptions[activeIndex]);
      return;
    }
    if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
      return;
    }
    if (event.key === "Tab") {
      setOpen(false);
      return;
    }
    if (event.key.length === 1 && /\S/.test(event.key)) {
      typeaheadRef.current += event.key.toLocaleLowerCase();
      if (typeaheadTimer.current) clearTimeout(typeaheadTimer.current);
      typeaheadTimer.current = setTimeout(() => { typeaheadRef.current = ""; }, 550);
      const match = flatOptions.findIndex((option) => !option.disabled && option.label.toLocaleLowerCase().startsWith(typeaheadRef.current));
      if (match >= 0) {
        if (!open) show();
        setActiveIndex(match);
      }
    }
  }

  return (
    <div className={`n2-select ${compact ? "compact" : ""} ${className}`.trim()}>
      {name && <input type="hidden" name={name} value={selectedValue} />}
      <button
        ref={internalButtonRef}
        id={controlId}
        type="button"
        role="combobox"
        aria-label={ariaLabel ?? ariaLabelAttribute}
        aria-describedby={ariaDescribedBy ?? ariaDescribedByAttribute}
        aria-controls={listId}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-required={required || undefined}
        aria-activedescendant={open && flatOptions[activeIndex] ? `${listId}-option-${activeIndex}` : undefined}
        disabled={disabled}
        onPointerDown={onPointerDown}
        onClick={() => open ? setOpen(false) : show()}
        onKeyDown={onKeyDown}
      >
        <span className={!selected ? "placeholder" : ""}>{selected?.label ?? placeholder}</span>
        <ChevronDown size={14} aria-hidden="true" />
      </button>
      {mounted && open && createPortal(
        <div ref={panelRef} id={listId} className="n2-select-list" role="listbox" aria-label={ariaLabel ?? ariaLabelAttribute} style={panelStyle}>
          {options.map((item, groupIndex) => isGroup(item) ? (
            <section key={`${item.label}-${groupIndex}`} role="group" aria-label={item.label}>
              <span className="n2-select-group-label">{item.label}</span>
              {item.options.map((option) => {
                const index = flatOptions.indexOf(option);
                return <button key={option.value} id={`${listId}-option-${index}`} type="button" role="option" aria-selected={option.value === selectedValue} disabled={option.disabled} className={index === activeIndex ? "active" : ""} onPointerMove={() => setActiveIndex(index)} onClick={() => choose(option)}><span>{option.label}</span>{option.value === selectedValue && <Check size={13} aria-hidden="true" />}</button>;
              })}
            </section>
          ) : (() => {
            const index = flatOptions.indexOf(item);
            return <button key={item.value} id={`${listId}-option-${index}`} type="button" role="option" aria-selected={item.value === selectedValue} disabled={item.disabled} className={index === activeIndex ? "active" : ""} onPointerMove={() => setActiveIndex(index)} onClick={() => choose(item)}><span>{item.label}</span>{item.value === selectedValue && <Check size={13} aria-hidden="true" />}</button>;
          })())}
        </div>,
        document.body,
      )}
    </div>
  );
});

export default N2Select;
