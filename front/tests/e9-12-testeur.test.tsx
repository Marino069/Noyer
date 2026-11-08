import { readFileSync } from "node:fs";
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  api: { commande: vi.fn(), payer: vi.fn() },
}));
vi.mock("@/lib/api", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api")>();
  return { ...original, api: { ...original.api, ...hoisted.api } };
});

import { Confirmation } from "@/components/Confirmation";
import { LampeGresillante } from "@/components/LampeGresillante";
import fr from "@/i18n/dictionaries/fr.json";
import { cleEmailCommande } from "@/lib/commande";

const REF = "NOY-2026-00042";
const css = (f: string) => readFileSync(`components/${f}.module.css`, "utf8");

/** Retire les blocs @media (prefers-reduced-motion: no-preference) : ce qui reste est « toujours actif ». */
function horsMediaNoPref(source: string) {
  let out = "";
  let i = 0;
  const re = /@media\s*\(prefers-reduced-motion:\s*no-preference\)\s*\{/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source))) {
    out += source.slice(i, m.index);
    let depth = 1;
    let j = re.lastIndex;
    while (depth && j < source.length) {
      if (source[j] === "{") depth++;
      if (source[j] === "}") depth--;
      j++;
    }
    i = j;
    re.lastIndex = j;
  }
  return out + source.slice(i);
}

describe("E9-12 · animations uniquement sous no-preference", () => {
  it.each(["LampeGresillante", "Tampon", "Confirmation"])(
    "%s : aucune propriété animation hors media no-preference",
    (f) => {
      const reste = horsMediaNoPref(css(f));
      expect(reste).not.toMatch(/\banimation(-name)?\s*:/);
    },
  );
});

describe("E9-12 · grésillement ≤ 3 flashs/s (analyse des keyframes)", () => {
  it("compte les flashs réels des keyframes et la durée du cycle", () => {
    const src = css("LampeGresillante");
    const kf = /@keyframes gresille\s*\{([\s\S]*?)\n\}/.exec(src)![1];
    const etapes = [...kf.matchAll(/([\d%,\s]+)\{\s*opacity:\s*([\d.]+)/g)]
      .flatMap((m) =>
        m[1]
          .split(",")
          .map((p) => ({ pct: parseFloat(p), op: parseFloat(m[2]) })),
      )
      .sort((a, b) => a.pct - b.pct);
    const base = etapes[0].op;
    let flashs = 0;
    for (let k = 1; k < etapes.length; k++) {
      if (etapes[k].op > base && etapes[k - 1].op <= base) flashs++;
    }
    const duree = parseFloat(/animation:\s*gresille\s+([\d.]+)s/.exec(src)![1]);
    expect(flashs).toBeGreaterThan(0);
    expect(flashs / duree).toBeLessThanOrEqual(3);
  });
});

describe("E9-12 · reduced-motion : lampe directement allumée", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", (q: string) => ({
      matches: q.includes("reduce"),
      media: q,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
  });
  afterEach(() => vi.unstubAllGlobals());

  it("ampoule allumée et message final sans interaction", () => {
    const t = fr.notFound.lampe;
    const { container } = render(
      <LampeGresillante
        messageGresille={t.gresille}
        messageAllumee={t.allumee}
        libelleAllumer={t.allumer}
        libelleEteindre={t.eteindre}
      />,
    );
    expect(container.querySelector("[data-allumee]")).toHaveAttribute(
      "data-allumee",
      "true",
    );
    expect(screen.getByRole("status").textContent).toBe(t.allumee);
  });
});

describe("E9-12 · confirmation : message complet en role=status", () => {
  beforeEach(() => {
    hoisted.api.commande.mockReset();
    sessionStorage.clear();
    sessionStorage.setItem(cleEmailCommande(REF), "client@exemple.ch");
  });

  it("le texte d'introduction est entier dans le DOM et dans un role=status", async () => {
    hoisted.api.commande.mockResolvedValue({
      ok: true,
      data: {
        reference: REF,
        statut: "Payee",
        cree_le: "2026-10-05T14:30:00+02:00",
        lignes: [
          {
            nom_produit: "Lucerne Premium",
            gamme: "Premium",
            numero_piece: 7,
            prix_unitaire_centimes: 124000,
            quantite: 1,
          },
        ],
        total_centimes: 124000,
      },
    });
    render(
      <Confirmation
        textes={fr.confirmation}
        locale="fr"
        reference={REF}
        catalogueHref="/fr/produits"
      />,
    );
    const attendu = fr.confirmation.paidIntro.replace("{reference}", REF);
    const statut = await screen.findByText(attendu);
    expect(statut).toHaveAttribute("role", "status");
    expect(statut).not.toHaveAttribute("aria-hidden");
  });
});
