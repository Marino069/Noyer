import { interpolate } from "@/lib/format";
import styles from "./Badge.module.css";

type BadgeProps =
  | {
      kind: "piece";
      numero: number;
      total: number;
      /** Message du dictionnaire avec `{numero}` et `{total}`. */
      label: string;
      className?: string;
    }
  | { kind: "soldOut"; label: string; className?: string };

/** « Pièce n° X / Y » (Premium) ou « Épuisé ». */
export function Badge(props: BadgeProps) {
  const text =
    props.kind === "piece"
      ? interpolate(props.label, { numero: props.numero, total: props.total })
      : props.label;
  const classes = [
    styles.badge,
    props.kind === "soldOut" ? styles.soldOut : undefined,
    props.className,
  ]
    .filter(Boolean)
    .join(" ");
  return <span className={classes}>{text}</span>;
}
