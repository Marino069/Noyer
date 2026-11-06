import type { ReactNode } from "react";
import styles from "./Surtitre.module.css";

type SurtitreProps = {
  children: ReactNode;
  /** Sur un registre sombre. */
  tone?: "light" | "dark";
  /** Accent laiton (filet devant le texte) : jamais en aplat. */
  accent?: boolean;
  className?: string;
};

/** Surtitre en petites capitales espacées. */
export function Surtitre({
  children,
  tone = "light",
  accent = false,
  className,
}: SurtitreProps) {
  const classes = [
    styles.surtitre,
    tone === "dark" ? styles.dark : undefined,
    accent ? styles.accent : undefined,
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return <p className={classes}>{children}</p>;
}
