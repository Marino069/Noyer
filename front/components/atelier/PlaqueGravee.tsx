import styles from "./PlaqueGravee.module.css";

type PlaqueGraveeProps = {
  /** Numéro choisi ; `null` = pas encore de choix (attribution automatique). */
  numero: number | null;
  total: number;
  /** Petit libellé au-dessus, ex. « Votre pièce ». */
  label?: string;
  /** Mention à droite, ex. « Numéro gravé sous le pied ». */
  note?: string;
  className?: string;
};

/** Plaque gravée « N° 07 / 50 » (registre sombre). Le texte est lisible tel quel. */
export function PlaqueGravee({
  numero,
  total,
  label,
  note,
  className,
}: PlaqueGraveeProps) {
  return (
    <div className={[styles.plaque, className].filter(Boolean).join(" ")}>
      <div>
        {label ? <p className={styles.label}>{label}</p> : null}
        {/* key : relance la gravure à chaque nouveau numéro. */}
        <p
          key={numero ?? "auto"}
          className={`${styles.numero} ${numero === null ? "" : styles.grave}`}
        >
          {`N° ${numero === null ? "––" : String(numero).padStart(2, "0")} `}
          <span className={styles.total}>{`/ ${total}`}</span>
        </p>
      </div>
      {note ? <p className={styles.note}>{note}</p> : null}
    </div>
  );
}
