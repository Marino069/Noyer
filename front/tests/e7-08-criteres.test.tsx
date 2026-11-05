import { render } from "@testing-library/react";
import axe from "axe-core";
import { describe, expect, it, vi } from "vitest";
import { pagesContenu } from "@/mocks/data";

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  usePathname: () => "/fr",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("react-dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-dom")>()),
  preload: vi.fn(),
}));
vi.mock("@/lib/contenu", () => ({
  chargerPageContenu: async (slug: string) => ({
    result: { ok: true, data: pagesContenu[slug].contenu },
    apercu: false,
  }),
}));

import HomePage from "../app/[locale]/page";
import ContactPage from "../app/[locale]/contact/page";
import PageContenuRoute from "../app/[locale]/[slug]/page";

async function graves(container: HTMLElement) {
  const res = await axe.run(container, {
    runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
    rules: { "color-contrast": { enabled: false } },
  });
  return res.violations
    .filter((v) => v.impact === "critical" || v.impact === "serious")
    .map(
      (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`,
    );
}

const locale = Promise.resolve({ locale: "fr" });

describe("[E7-08] Critère : un test axe par page, sans violation sérieuse ou critique (vraies routes)", () => {
  it("accueil", async () => {
    const { container } = render(await HomePage({ params: locale }));
    expect(await graves(container)).toEqual([]);
  });

  it("contact", async () => {
    const { container } = render(await ContactPage({ params: locale }));
    expect(await graves(container)).toEqual([]);
  });

  it.each(["impressum", "cgv", "confidentialite"])(
    "page légale %s",
    async (slug) => {
      const { container } = render(
        await PageContenuRoute({
          params: Promise.resolve({ locale: "fr", slug }),
        }),
      );
      expect(container.querySelector("h1")).not.toBeNull();
      expect(await graves(container)).toEqual([]);
    },
  );
});
