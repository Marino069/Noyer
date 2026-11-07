import styles from "./BandeauDemo.module.css";

/** Affiché seulement sur le site de démonstration (NEXT_PUBLIC_API_MOCKS=true). */
export function BandeauDemo({ texte }: { texte: string }) {
  return (
    <p role="note" className={styles.bandeau}>
      {texte}
    </p>
  );
}
