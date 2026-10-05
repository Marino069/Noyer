"use client";

import { Button } from "@/components/Button";
import { CartIndicator } from "@/components/CartIndicator";
import type { Dictionary } from "@/i18n/get-dictionary";
import { publishCart } from "@/lib/cart";
import type { Panier } from "@/lib/api";
import styles from "./page.module.css";

const withQuantity = (quantite: number): Panier => ({
  lignes: quantite
    ? [{ id: "demo", quantite } as unknown as Panier["lignes"][number]]
    : [],
  sous_total_centimes: 0,
  frais_livraison_centimes: 0,
  tva_incluse_centimes: 0,
  taux_tva: "8.10",
  total_centimes: 0,
});

/** Démo : les boutons simulent le panier renvoyé par l'API (vide, 1 article, plusieurs). */
export function CartIndicatorDemo({
  href,
  labels,
}: {
  href: string;
  labels: Dictionary["header"]["cart"];
}) {
  return (
    <div className={styles.row}>
      <CartIndicator href={href} labels={labels} />
      {[0, 1, 2, 12].map((quantite) => (
        <Button
          key={quantite}
          variant="secondary"
          onClick={() => publishCart(withQuantity(quantite))}
        >
          {quantite} article(s)
        </Button>
      ))}
    </div>
  );
}
