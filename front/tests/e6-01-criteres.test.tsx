// Tests indépendants du ticket E6-01 : un bloc par critère d'acceptation.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  revalidateTag: vi.fn(),
  draft: { enable: vi.fn(), disable: vi.fn(), isEnabled: false },
  api: { pageContenu: vi.fn() },
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));
vi.mock("next/cache", () => ({ revalidateTag: hoisted.revalidateTag }));
vi.mock("next/headers", () => ({ draftMode: async () => hoisted.draft }));
vi.mock("next/navigation", () => ({ notFound: hoisted.notFound }));
vi.mock("@/lib/api", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api")>();
  return { ...original, api: { ...original.api, ...hoisted.api } };
});

import { TexteRiche } from "@/components/TexteRiche";
import PageRoute, { generateMetadata } from "@/app/[locale]/[slug]/page";
import { pagesContenu } from "@/mocks/data";
import type { BlocTexte } from "@/lib/api/types";

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  hoisted.draft.isEnabled = false;
});

const params = (locale: string, slug: string) => ({
  params: Promise.resolve({ locale, slug }),
});

describe("Critère 1 : récupération + revalidation par webhook", () => {
  const post = async (headers: Record<string, string>, raw?: string) => {
    vi.stubEnv("REVALIDATE_SECRET", "s3cret");
    vi.resetModules();
    const { POST } = await import("@/app/api/revalidate/route");
    const { NextRequest } = await import("next/server");
    return POST(
      new NextRequest("http://localhost/api/revalidate", {
        method: "POST",
        headers,
        body: raw,
      }),
    );
  };

  it("refuse le webhook si le secret n'est pas configuré", async () => {
    vi.stubEnv("REVALIDATE_SECRET", "");
    vi.resetModules();
    const { POST } = await import("@/app/api/revalidate/route");
    const { NextRequest } = await import("next/server");
    const res = await POST(
      new NextRequest("http://localhost/api/revalidate", {
        method: "POST",
        headers: { "x-webhook-secret": "" },
      }),
    );
    expect(res.status).toBe(401);
    expect(hoisted.revalidateTag).not.toHaveBeenCalled();
  });

  it("refuse un secret proche ou de longueur différente", async () => {
    expect((await post({ "x-webhook-secret": "s3cre" })).status).toBe(401);
    expect((await post({ "x-webhook-secret": "s3cretX" })).status).toBe(401);
    expect(hoisted.revalidateTag).not.toHaveBeenCalled();
  });

  it("revalide tout avec un corps invalide ou un slug mal formé", async () => {
    const h = { "x-webhook-secret": "s3cret" };
    await post(h, "pas du json");
    await post(h, JSON.stringify({ slug: "../x" }));
    await post(h, JSON.stringify({ slug: 42 }));
    expect(hoisted.revalidateTag).toHaveBeenCalledTimes(3);
    for (const call of hoisted.revalidateTag.mock.calls)
      expect(call).toEqual(["contenu", { expire: 0 }]);
  });

  it("la page publiée expose titre et description en métadonnées", async () => {
    hoisted.api.pageContenu.mockResolvedValue({
      ok: true,
      data: pagesContenu.atelier.contenu,
    });
    const meta = await generateMetadata(params("fr", "atelier"));
    expect(meta.title).toBe(pagesContenu.atelier.contenu.titre);
    expect(meta.description).toBe(pagesContenu.atelier.contenu.description);
    expect(meta.robots).toBeUndefined();
  });

  it("renvoie un 404 si la page n'existe pas", async () => {
    hoisted.api.pageContenu.mockResolvedValue({
      ok: false,
      error: { status: 404, message: "absent" },
    });
    await expect(PageRoute(params("fr", "nope"))).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
  });

  it("renvoie un 404 pour une langue inconnue sans appeler l'API", async () => {
    await expect(PageRoute(params("xx", "atelier"))).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
    expect(hoisted.api.pageContenu).not.toHaveBeenCalled();
  });
});

describe("Critère 2 : mode aperçu", () => {
  const get = async (query: string, secret = "apercu-secret") => {
    vi.stubEnv("PREVIEW_SECRET", secret);
    vi.resetModules();
    const { GET } = await import("@/app/api/apercu/route");
    const { NextRequest } = await import("next/server");
    return GET(new NextRequest(`http://localhost/api/apercu?${query}`));
  };

  it("refuse un slug invalide même avec le bon secret", async () => {
    const res = await get("secret=apercu-secret&slug=../admin");
    expect(res.status).toBe(401);
    expect(hoisted.draft.enable).not.toHaveBeenCalled();
  });

  it("refuse sans secret", async () => {
    expect((await get("slug=atelier")).status).toBe(401);
    expect(hoisted.draft.enable).not.toHaveBeenCalled();
  });

  it("refuse tout si PREVIEW_SECRET n'est pas défini", async () => {
    const res = await get("secret=&slug=atelier", "");
    expect(res.status).toBe(401);
    expect(hoisted.draft.enable).not.toHaveBeenCalled();
  });

  it("?quitter=1 désactive le mode aperçu et redirige", async () => {
    const res = await get("quitter=1");
    expect(hoisted.draft.disable).toHaveBeenCalled();
    expect(res.status).toBeGreaterThanOrEqual(300);
    expect(res.status).toBeLessThan(400);
  });

  it("un brouillon est noindex et signalé par un bandeau", async () => {
    vi.stubEnv("PREVIEW_SECRET", "apercu-secret");
    vi.resetModules();
    hoisted.draft.isEnabled = true;
    hoisted.api.pageContenu.mockResolvedValue({
      ok: true,
      data: pagesContenu.brouillon.contenu,
    });
    const page = await import("@/app/[locale]/[slug]/page");
    const meta = await page.generateMetadata(params("fr", "brouillon"));
    expect(meta.robots).toMatchObject({ index: false, follow: false });
    expect(hoisted.api.pageContenu).toHaveBeenCalledWith("brouillon", {
      apercu: "apercu-secret",
    });
    render(await page.default(params("fr", "brouillon")));
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: "Brouillon" }),
    ).toBeInTheDocument();
  });

  it("hors aperçu : pas de bandeau et pas de jeton envoyé", async () => {
    hoisted.api.pageContenu.mockResolvedValue({
      ok: true,
      data: pagesContenu.atelier.contenu,
    });
    render(await PageRoute(params("fr", "atelier")));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(hoisted.api.pageContenu).toHaveBeenCalledWith("atelier", {
      apercu: undefined,
    });
  });
});

describe("Critère 3 : texte riche sur les composants typographiques", () => {
  it("n'injecte jamais de HTML brut", () => {
    const blocs: BlocTexte[] = [
      {
        type: "paragraphe",
        segments: [
          { texte: '<script>alert(1)</script><img src=x onerror="y">' },
        ],
      },
    ];
    const { container } = render(<TexteRiche blocs={blocs} locale="fr" />);
    expect(container.querySelector("script, img")).toBeNull();
    expect(container.textContent).toContain("<script>");
  });

  it("affiche le texte d'un lien dangereux sans créer de lien", () => {
    const blocs: BlocTexte[] = [
      {
        type: "paragraphe",
        segments: [
          { texte: "piège", lien: "javascript:alert(1)" },
          { texte: "data", lien: "data:text/html,x" },
        ],
      },
    ];
    const { container } = render(<TexteRiche blocs={blocs} locale="fr" />);
    expect(container.querySelector("a")).toBeNull();
    expect(container.textContent).toBe("piègedata");
  });

  it("liens externes https : rel noopener", () => {
    const blocs: BlocTexte[] = [
      {
        type: "paragraphe",
        segments: [{ texte: "ext", lien: "https://exemple.ch/x" }],
      },
    ];
    render(<TexteRiche blocs={blocs} locale="fr" />);
    const a = screen.getByRole("link", { name: "ext" });
    expect(a).toHaveAttribute("href", "https://exemple.ch/x");
    expect(a.getAttribute("rel")).toMatch(/noopener/);
  });

  it("gère titre niveau 3, liste à puces et gras+italique combinés", () => {
    const blocs: BlocTexte[] = [
      { type: "titre", niveau: 3, segments: [{ texte: "Sous-titre" }] },
      {
        type: "liste",
        ordonnee: false,
        items: [[{ texte: "a", gras: true, italique: true }], [{ texte: "b" }]],
      },
    ];
    const { container } = render(<TexteRiche blocs={blocs} locale="fr" />);
    expect(
      screen.getByRole("heading", { level: 3, name: "Sous-titre" }),
    ).toBeInTheDocument();
    expect(container.querySelectorAll("ul > li")).toHaveLength(2);
    expect(
      container.querySelector("li strong em, li em strong"),
    ).not.toBeNull();
  });

  it("une citation sans auteur n'a pas de <cite>", () => {
    const blocs: BlocTexte[] = [
      { type: "citation", segments: [{ texte: "Seule" }] },
    ];
    const { container } = render(<TexteRiche blocs={blocs} locale="fr" />);
    expect(container.querySelector("blockquote")).not.toBeNull();
    expect(container.querySelector("cite")).toBeNull();
  });

  it("le CSS n'utilise que des tokens (pas de couleur, police ni rayon en dur)", () => {
    const css = readFileSync(
      join(process.cwd(), "components/TexteRiche.module.css"),
      "utf8",
    ).replace(/\/\*[\s\S]*?\*\//g, "");
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(css).not.toMatch(/\b(rgb|hsl)a?\(/);
    for (const prop of ["font-family", "border-radius"])
      for (const m of css.matchAll(new RegExp(`${prop}:\\s*([^;]+);`, "g")))
        expect(m[1].trim()).toMatch(/^var\(--/);
  });
});
