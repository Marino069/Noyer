import styles from "./LegendeFigure.module.css";

type LegendeFigureProps = {
  numero: number;
  /** Titre court après le numéro, ex. « Le grain ». */
  titre?: string;
  /** Sur une image : posée en bas à gauche, sur fond clair translucide. */
  surImage?: boolean;
  className?: string;
};

/** Légende de figure « FIG. 01 — LE GRAIN » : un vrai `<figcaption>`, lisible par les lecteurs d'écran. */
export function LegendeFigure({
  numero,
  titre,
  surImage = false,
  className,
}: LegendeFigureProps) {
  const classes = [
    styles.legende,
    surImage ? styles.surImage : undefined,
    className,
  ]
    .filter(Boolean)
    .join(" ");
  const numeroTexte = `FIG. ${String(numero).padStart(2, "0")}`;
  return (
    <figcaption className={classes}>
      {titre ? `${numeroTexte} — ${titre}` : numeroTexte}
    </figcaption>
  );
}
