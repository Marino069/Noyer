import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  revalidateTag: vi.fn(),
  draft: { enable: vi.fn(), disable: vi.fn(), isEnabled: false },
}));
vi.mock("next/cache", () => ({ revalidateTag: hoisted.revalidateTag }));
vi.mock("next/headers", () => ({
  draftMode: async () => hoisted.draft,
}));

import { TexteRiche, lienSur } from "@/components/TexteRiche";
import { api } from "@/lib/api";
import type { BlocTexte } from "@/lib/api/types";

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  vi.resetModules();
  hoisted.draft.isEnabled = false;
});

describe("Rendu du texte riche", () => {
  const blocs: BlocTexte[] = [
    {
      type: "titre",
      niveau: 2,
      segments: [{ texte: "Le geste, " }, { texte: "lent", italique: true }],
    },
    {
      type: "paragraphe",
      segments: [
        { texte: "En " },
        { texte: "noyer", gras: true },
        { texte: "voir", lien: "/produits" },
      ],
    },
    { type: "citation", segments: [{ texte: "Citation" }], auteur: "Atelier" },
    { type: "liste", ordonnee: true, items: [[{ texte: "Un" }]] },
  ];

  it("mappe chaque bloc sur un élément typographique", () => {
    const { container } = render(<TexteRiche blocs={blocs} locale="fr" />);
    expect(
      screen.getByRole("heading", { level: 2, name: "Le geste, lent" }),
    ).toBeInTheDocument();
    expect(container.querySelector("h2 em")?.textContent).toBe("lent");
    expect(container.querySelector("p strong")?.textContent).toBe("noyer");
    expect(container.querySelector("blockquote cite")?.textContent).toBe(
      "Atelier",
    );
    expect(container.querySelector("ol li")?.textContent).toBe("Un");
    expect(screen.getByRole("link", { name: "voir" })).toHaveAttribute(
      "href",
      "/fr/produits",
    );
  });

  it("refuse les liens dangereux et ignore les blocs inconnus", () => {
    expect(lienSur("javascript:alert(1)", "fr")).toBeNull();
    expect(lienSur("//evil.example", "fr")).toBeNull();
    expect(lienSur("http://exemple.ch", "fr")).toBeNull();
    expect(lienSur("https://exemple.ch", "fr")).toBe("https://exemple.ch");
    const inconnu = [{ type: "video" }] as unknown as BlocTexte[];
    const { container } = render(<TexteRiche blocs={inconnu} locale="fr" />);
    expect(container.firstElementChild?.children).toHaveLength(0);
  });
});

describe("Récupération des contenus", () => {
  it("appelle /contenu/pages/<slug>/ avec les tags de cache, sans aperçu", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(Response.json({ slug: "atelier" }));
    await api.pageContenu("atelier");
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/contenu\/pages\/atelier\/$/);
    expect(
      (init as RequestInit & { next?: { tags: string[] } }).next?.tags,
    ).toEqual(["contenu", "contenu:atelier"]);
    fetchMock.mockRestore();
  });

  it("en aperçu, envoie le jeton et ne met rien en cache", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(Response.json({ slug: "atelier" }));
    await api.pageContenu("atelier", { apercu: "jeton" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("apercu=jeton");
    expect((init as RequestInit).cache).toBe("no-store");
    fetchMock.mockRestore();
  });
});

describe("Webhook de revalidation", () => {
  const appeler = async (headers: Record<string, string>, body?: unknown) => {
    vi.stubEnv("REVALIDATE_SECRET", "s3cret");
    const { POST } = await import("@/app/api/revalidate/route");
    const { NextRequest } = await import("next/server");
    return POST(
      new NextRequest("http://localhost/api/revalidate", {
        method: "POST",
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
    );
  };

  it("refuse sans le bon secret", async () => {
    expect((await appeler({})).status).toBe(401);
    expect((await appeler({ "x-webhook-secret": "faux" })).status).toBe(401);
    expect(hoisted.revalidateTag).not.toHaveBeenCalled();
  });

  it("revalide la page publiée", async () => {
    const res = await appeler(
      { "x-webhook-secret": "s3cret" },
      { slug: "atelier" },
    );
    expect(res.status).toBe(200);
    expect(hoisted.revalidateTag).toHaveBeenCalledWith("contenu:atelier", {
      expire: 0,
    });
  });

  it("revalide tous les contenus sans slug", async () => {
    await appeler({ "x-webhook-secret": "s3cret" });
    expect(hoisted.revalidateTag).toHaveBeenCalledWith("contenu", {
      expire: 0,
    });
  });
});

describe("Mode aperçu", () => {
  const appeler = async (query: string) => {
    vi.stubEnv("PREVIEW_SECRET", "apercu-secret");
    const { GET } = await import("@/app/api/apercu/route");
    const { NextRequest } = await import("next/server");
    return GET(new NextRequest(`http://localhost/api/apercu?${query}`));
  };

  it("refuse un mauvais secret", async () => {
    const res = await appeler("secret=faux&slug=atelier");
    expect(res.status).toBe(401);
    expect(hoisted.draft.enable).not.toHaveBeenCalled();
  });

  it("active le brouillon puis redirige vers la page", async () => {
    const res = await appeler("secret=apercu-secret&slug=atelier");
    expect(hoisted.draft.enable).toHaveBeenCalled();
    expect(res.headers.get("location")).toBe("http://localhost/fr/atelier");
  });

  it("charge le brouillon seulement quand le mode est actif", async () => {
    vi.stubEnv("PREVIEW_SECRET", "apercu-secret");
    const spy = vi
      .spyOn((await import("@/lib/api")).api, "pageContenu")
      .mockResolvedValue({ ok: false, error: { status: 404 } } as never);
    const { chargerPageContenu } = await import("@/lib/contenu");

    await chargerPageContenu("atelier");
    expect(spy).toHaveBeenLastCalledWith("atelier", { apercu: undefined });

    hoisted.draft.isEnabled = true;
    await chargerPageContenu("atelier");
    expect(spy).toHaveBeenLastCalledWith("atelier", {
      apercu: "apercu-secret",
    });
  });
});
