"use client";

import type { Gamme } from "@/lib/api";
import { AjoutPanier, type AjoutPanierTextes } from "./AjoutPanier";
import { AlerteSerie, type AlerteSerieTextes } from "./AlerteSerie";
import { estEpuise, useDisponibilite } from "./DisponibiliteLive";

type Props = {
  slug: string;
  gamme: Gamme;
  panierHref: string;
  textes: AjoutPanierTextes;
  alerte: AlerteSerieTextes;
};

/** Ajout au panier branché sur la disponibilité rafraîchie ; série épuisée → alerte e-mail. */
export function AchatLive({ slug, gamme, panierHref, textes, alerte }: Props) {
  const { disponibilite, refresh } = useDisponibilite();
  const numeros =
    disponibilite?.gamme === "Premium"
      ? disponibilite.series.flatMap((s) => s.numeros_disponibles)
      : [];
  const epuise = estEpuise(disponibilite);

  return (
    <>
      <AjoutPanier
        slug={slug}
        gamme={gamme}
        numeros={numeros}
        disabled={epuise}
        panierHref={panierHref}
        textes={textes}
        onUnavailable={refresh}
      />
      {epuise && gamme === "Premium" ? <AlerteSerie textes={alerte} /> : null}
    </>
  );
}
