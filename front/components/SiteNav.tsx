"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "./Button";
import styles from "./SiteNav.module.css";

type NavLink = { href: string; label: string };

const DESKTOP_QUERY = "(min-width: 800px)";
const FOCUSABLE = "a[href], button:not([disabled])";

/**
 * Navigation principale : liste de liens + CTA en desktop, menu burger sous 800 px.
 * Menu ouvert : focus piégé, Échap ferme et rend le focus au bouton, scroll de la page bloqué.
 */
export function SiteNav({
  links,
  cta,
  labels,
}: {
  links: NavLink[];
  cta: NavLink;
  labels: { label: string; open: string; close: string };
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const header = rootRef.current?.closest("header") ?? null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const getFocusable = () =>
      Array.from(header?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []).filter(
        (el) => el.offsetParent !== null,
      );

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
        return;
      }
      if (event.key !== "Tab") return;
      const items = getFocusable();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      const outside = !header?.contains(active);
      if (event.shiftKey && (active === first || outside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || outside)) {
        event.preventDefault();
        first.focus();
      }
    };

    // Repasser en desktop referme le menu (le scroll doit être rendu).
    const media = window.matchMedia(DESKTOP_QUERY);
    const onChange = (event: MediaQueryListEvent) => {
      if (event.matches) setOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);
    media.addEventListener("change", onChange);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      media.removeEventListener("change", onChange);
    };
  }, [open]);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div ref={rootRef} className={styles.root}>
      <button
        ref={buttonRef}
        type="button"
        className={styles.toggle}
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="visually-hidden">
          {open ? labels.close : labels.open}
        </span>
        <span className={styles.bars} aria-hidden="true" />
      </button>
      <nav
        id={menuId}
        aria-label={labels.label}
        className={styles.menu}
        hidden={!open}
      >
        <ul className={styles.list}>
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className={styles.link}
                aria-current={isActive(link.href) ? "page" : undefined}
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            </li>
          ))}
          <li className={styles.cta}>
            <Button
              href={cta.href}
              aria-current={isActive(cta.href) ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              {cta.label}
            </Button>
          </li>
        </ul>
      </nav>
    </div>
  );
}
