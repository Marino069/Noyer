import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({ disponibilite: vi.fn() }));
vi.mock("@/lib/api", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...original,
    api: { ...original.api, disponibilite: hoisted.disponibilite },
  };
});

import { DisponibiliteLive } from "@/components/DisponibiliteLive";

const rc = JSON.parse(
  readFileSync(join(__dirname, "..", "lighthouserc.json"), "utf8"),
).ci;
type Matrice = {
  matchingUrlPattern: string;
  assertions: Record<string, [string, Record<string, number>]>;
}[];
const fiche = (rc.assert.assertMatrix as Matrice).find((m) =>
  new RegExp(m.matchingUrlPattern).test(
    "http://localhost:3000/fr/produits/lucerne-classic",
  ),
)!.assertions;

describe("[E7-09] LCP simulé de la fiche produit : configuration", () => {
  it("la fiche produit est auditée par Lighthouse CI", () => {
    expect(rc.collect.url).toContain(
      "http://localhost:3000/fr/produits/lucerne-classic",
    );
  });

  it("largest-contentful-paint est en error, ≤ 2500 ms, pour la fiche", () => {
    expect(fiche["largest-contentful-paint"][0]).toBe("error");
    expect(
      fiche["largest-contentful-paint"][1].maxNumericValue,
    ).toBeLessThanOrEqual(2500);
  });

  it("aucune assertion de la fiche n'est en warn ou off", () => {
    for (const [nom, [niveau]] of Object.entries(fiche)) {
      expect(niveau, nom).toBe("error");
    }
  });
});

describe("[E7-09] DisponibiliteLive : premier rafraîchissement après load", () => {
  const initial = {
    ok: true as const,
    data: { gamme: "Classic", quantite_disponible: 3 },
  };

  beforeEach(() => {
    vi.useFakeTimers();
    hoisted.disponibilite.mockReset();
    hoisted.disponibilite.mockResolvedValue({ ok: false });
  });
  afterEach(() => {
    vi.useRealTimers();
    // Retire la surcharge d'instance : on retrouve le readyState du prototype.
    delete (document as unknown as Record<string, unknown>).readyState;
  });

  const monter = () =>
    render(
      <DisponibiliteLive slug="lucerne-classic" initial={initial as never}>
        <p>x</p>
      </DisponibiliteLive>,
    );
  const fixerEtat = (v: string) =>
    Object.defineProperty(document, "readyState", {
      configurable: true,
      get: () => v,
    });

  it("n'appelle pas l'API avant load si la page charge encore", async () => {
    fixerEtat("loading");
    monter();
    await vi.advanceTimersByTimeAsync(1000);
    expect(hoisted.disponibilite).not.toHaveBeenCalled();
  });

  it("appelle l'API juste après l'événement load", async () => {
    fixerEtat("loading");
    monter();
    window.dispatchEvent(new Event("load"));
    await vi.advanceTimersByTimeAsync(10);
    expect(hoisted.disponibilite).toHaveBeenCalledTimes(1);
    expect(hoisted.disponibilite).toHaveBeenCalledWith("lucerne-classic");
  });

  it("appelle l'API tout de suite si la page est déjà chargée", async () => {
    fixerEtat("complete");
    monter();
    await vi.advanceTimersByTimeAsync(10);
    expect(hoisted.disponibilite).toHaveBeenCalledTimes(1);
  });

  it("démonté avant load : aucun appel", async () => {
    fixerEtat("loading");
    const { unmount } = monter();
    unmount();
    window.dispatchEvent(new Event("load"));
    await vi.advanceTimersByTimeAsync(1000);
    expect(hoisted.disponibilite).not.toHaveBeenCalled();
  });

  it("le rafraîchissement périodique continue", async () => {
    fixerEtat("complete");
    monter();
    await vi.advanceTimersByTimeAsync(30_000);
    expect(hoisted.disponibilite.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});
