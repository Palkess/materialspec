import { useState, useEffect, useRef } from "react";

export function usePopoverMenu(menuAttr: string) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  const closeMenu = () => {
    setOpenMenu(null);
    triggerRef.current?.focus();
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(`[${menuAttr}]`)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuAttr]);

  useEffect(() => {
    if (!openMenu || !popoverRef.current) return;
    const items = Array.from(
      popoverRef.current.querySelectorAll<HTMLElement>(
        "a[role='menuitem'], button[role='menuitem']"
      )
    );
    items[0]?.focus();

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeMenu();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        const idx = items.indexOf(document.activeElement as HTMLElement);
        items[(idx + 1) % items.length]?.focus();
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        const idx = items.indexOf(document.activeElement as HTMLElement);
        items[(idx - 1 + items.length) % items.length]?.focus();
        return;
      }
      if (e.key === "Tab") {
        e.preventDefault();
        const idx = items.indexOf(document.activeElement as HTMLElement);
        if (e.shiftKey) {
          items[(idx - 1 + items.length) % items.length]?.focus();
        } else {
          items[(idx + 1) % items.length]?.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [openMenu]);

  const toggleMenu = (id: string, btn: HTMLButtonElement) => {
    if (openMenu === id) {
      closeMenu();
      return;
    }
    triggerRef.current = btn;
    const rect = btn.getBoundingClientRect();
    setMenuPos({
      top: rect.bottom + window.scrollY + 4,
      right: window.innerWidth - rect.right,
    });
    setOpenMenu(id);
  };

  return { openMenu, menuPos, triggerRef, popoverRef, toggleMenu, closeMenu };
}
