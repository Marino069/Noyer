import { readFileSync } from "node:fs";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LampeGresillante } from "@/components/LampeGresillante";
import { NewsletterForm } from "@/components/NewsletterForm";
import fr from "@/i18n/dictionaries/fr.json";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    api: {
      ...actual.api,
      newsletter: vi.fn(async () => ({ ok: true, data: {} })),
    },
  };
});

const t = fr.notFound.lampe;
const lampe = () =>
  render(
    <LampeGresillante
      messageGresille={t.gresille}
      messageAllumee={t.allumee}
      libelleAllumer={t.allumer}
      libelleEteindre={t.eteindre}
    />,
  );

function reduced(matches: boolean) {
  vi.stubGlobal("matchMedia", (q: string) => ({
    matches: matches && q.includes("reduce"),
    media: q,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

afterEach(() => vi.unstubAllGlobals());

describe("E9-12 petits moments", () => {
  it("404 : message en role=status, lampe rallumée par l'interrupteur", async () => {
    reduced(false);
    lampe();
    expect(screen.getByRole("status")).toHaveTextContent(t.gresille);
    await userEvent.click(screen.getByRole("button", { name: t.allumer }));
    expect(screen.getByRole("status")).toHaveTextContent(t.allumee);
  });

  it("404 reduced-motion : état final (allumée) directement", () => {
    reduced(true);
    lampe();
    expect(screen.getByRole("status")).toHaveTextContent(t.allumee);
    expect(
      screen.getByRole("button", { name: t.eteindre }),
    ).toBeInTheDocument();
  });

  it("newsletter : le tampon se pose après l'inscription, message lisible", async () => {
    reduced(false);
    render(<NewsletterForm dictionary={fr.newsletter} />);
    await userEvent.type(
      screen.getByLabelText(new RegExp(fr.newsletter.email)),
      "a@b.ch",
    );
    await userEvent.click(screen.getByRole("checkbox"));
    await userEvent.click(
      screen.getByRole("button", { name: fr.newsletter.submit }),
    );
    const statuts = await screen.findAllByRole("status");
    expect(
      statuts.some((s) => s.textContent?.includes(fr.newsletter.success)),
    ).toBe(true);
    expect(screen.getByText(fr.newsletter.tampon)).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("CSS : grésillement ≤ 3 flashs/s et animations coupées en reduced-motion", () => {
    const css = readFileSync("components/LampeGresillante.module.css", "utf8");
    expect(css).toContain("prefers-reduced-motion: no-preference");
    const duree = Number(/animation: gresille ([\d.]+)s/.exec(css)![1]);
    const flashsParCycle = 2;
    expect(flashsParCycle / duree).toBeLessThanOrEqual(3);
    for (const f of ["Tampon", "Confirmation"]) {
      expect(readFileSync(`components/${f}.module.css`, "utf8")).toContain(
        "prefers-reduced-motion: no-preference",
      );
    }
  });
});
