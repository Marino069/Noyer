"use client";

import { useState } from "react";
import { Interrupteur } from "@/components/Interrupteur";

/** Démo de l'interrupteur seul, éteint puis allumé. */
export function InterrupteurDemo({
  libelleAllumer,
  libelleEteindre,
}: {
  libelleAllumer: string;
  libelleEteindre: string;
}) {
  const [allumee, setAllumee] = useState(false);
  return (
    <Interrupteur
      allumee={allumee}
      onBascule={() => setAllumee((v) => !v)}
      libelleAllumer={libelleAllumer}
      libelleEteindre={libelleEteindre}
    />
  );
}
