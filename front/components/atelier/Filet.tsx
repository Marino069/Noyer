import styles from "./Filet.module.css";

type FiletProps = {
  tone?: "light" | "dark";
  /** Filet laiton (accent). */
  accent?: boolean;
  className?: string;
};

/** Filet 1 px, purement décoratif. */
export function Filet({
  tone = "light",
  accent = false,
  className,
}: FiletProps) {
  const classes = [
    styles.filet,
    tone === "dark" ? styles.dark : undefined,
    accent ? styles.accent : undefined,
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return <hr aria-hidden="true" className={classes} />;
}
