"use client";

import { interpolate } from "@/lib/format";
import type { Dictionary } from "@/i18n/get-dictionary";
import { Badge } from "./Badge";
import { useDisponibilite } from "./DisponibiliteLive";

type Props = {
  textes: Dictionary["fiche"];
  badge: Dictionary["badge"];
};

/** Ligne « Disponibilité » de la fiche, toujours alignée sur la dernière disponibilité connue. */
export function DispoLive({ textes, badge }: Props) {
  const { disponibilite: d } = useDisponibilite();
  if (!d) return null;
  if (d.gamme === "Classic") {
    return d.quantite_disponible > 0 ? (
      <p>
        {interpolate(textes.availability.inStock, {
          count: d.quantite_disponible,
        })}
      </p>
    ) : (
      <Badge kind="soldOut" label={badge.soldOut} />
    );
  }
  const restantes = d.series.reduce((t, s) => t + s.pieces_restantes, 0);
  const total = d.series.reduce((t, s) => t + s.taille_serie, 0);
  return restantes > 0 ? (
    <p>
      {interpolate(
        restantes === 1
          ? textes.availability.piece
          : textes.availability.pieces,
        { count: restantes, total },
      )}
    </p>
  ) : (
    <Badge kind="soldOut" label={badge.soldOut} />
  );
}
