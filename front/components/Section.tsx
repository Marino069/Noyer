import type { ComponentProps } from "react";
import styles from "./Section.module.css";

type SectionProps = Omit<ComponentProps<"section">, "style"> & {
  /** Registre de la charte : "light" (défaut), "alt" (fond alterné) ou "dark" (1-2 moments forts). */
  tone?: "light" | "alt" | "dark";
};

/**
 * Section de page : fond, texte, bordures et boutons des enfants suivent le registre choisi.
 * Seuls les fonds de la charte sont exposés : aucun aplat laiton possible.
 */
export function Section({
  tone = "light",
  className,
  children,
  ...rest
}: SectionProps) {
  const classes = [
    styles.section,
    tone === "alt" && styles.alt,
    tone === "dark" && styles.dark,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section {...rest} data-tone={tone} data-reveal="" className={classes}>
      <div className={styles.inner}>{children}</div>
    </section>
  );
}
