"use client";

import { useState } from "react";
import type { Dictionary } from "@/i18n/get-dictionary";
import { Button } from "./Button";
import styles from "./CarteShowroom.module.css";

// Genève, centre-ville (OpenStreetMap).
const OSM_SRC =
  "https://www.openstreetmap.org/export/embed.html?bbox=6.12%2C46.19%2C6.17%2C46.215&layer=mapnik";

/** Plan du showroom : aucune requête vers un tiers tant que le visiteur n'a pas donné son accord. */
export function CarteShowroom({
  dictionary,
}: {
  dictionary: Dictionary["contact"]["map"];
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className={styles.carte}>
      {visible ? (
        <iframe
          className={styles.frame}
          src={OSM_SRC}
          title={dictionary.frameTitle}
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      ) : (
        <p className={styles.notice}>{dictionary.notice}</p>
      )}
      <Button
        type="button"
        variant="secondary"
        aria-expanded={visible}
        onClick={() => setVisible((v) => !v)}
      >
        {visible ? dictionary.hide : dictionary.show}
      </Button>
    </div>
  );
}
