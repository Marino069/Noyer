import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

/** Violations axe critiques ou sérieuses, contrastes réels calculés par le navigateur inclus. */
async function violations(page: Page) {
  const res = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  return res.violations
    .filter((v) => v.impact === "critical" || v.impact === "serious")
    .map(
      (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`,
    );
}

/** Le focus clavier est dessiné (outline ou ombre non nuls) sur l'élément actif. */
async function focusVisible(page: Page) {
  const ok = await page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el || el === document.body) return false;
    if (!el.matches(":focus-visible")) return false;
    // L'anneau peut être porté par l'élément ou par un conteneur proche (carte produit).
    for (let n: HTMLElement | null = el, i = 0; n && i < 4; i++) {
      const s = getComputedStyle(n);
      const outline =
        s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0;
      if (outline || s.boxShadow !== "none") return true;
      n = n.parentElement;
    }
    return false;
  });
  const actif = await page.evaluate(() => {
    const el = document.activeElement;
    return `${el?.tagName} ${el?.getAttribute("href") ?? el?.textContent?.slice(0, 30)}`;
  });
  expect(ok, `focus visible sur l'élément actif (${actif})`).toBe(true);
}

/** Tabule jusqu'à l'élément visé, en vérifiant le focus visible à chaque pas. */
async function tabJusqua(page: Page, cible: Locator, max = 80) {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press("Tab");
    await focusVisible(page);
    const focus = await cible.evaluate((el) => el === document.activeElement);
    if (focus) return;
  }
  throw new Error(`élément non atteint au clavier : ${cible}`);
}

test("accueil → fiche → panier → paiement, au clavier, sans violation axe", async ({
  page,
}) => {
  // 1. Accueil
  await page.goto("/fr");
  await expect(page.locator("main h1")).toBeVisible();
  expect(await violations(page)).toEqual([]);

  // Lien d'évitement en premier arrêt de tabulation.
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Aller au contenu" }),
  ).toBeFocused();
  await focusVisible(page);

  // 2. Gamme Classic via la navigation, puis fiche Lucerne Classic
  const nav = page.getByRole("banner").getByRole("link", { name: "Classic" });
  await tabJusqua(page, nav);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/fr\/produits\?gamme=Classic$/);
  const carte = page
    .locator('main a[href$="/produits/lucerne-classic"]')
    .first();
  await tabJusqua(page, carte);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/fr\/produits\/lucerne-classic$/);
  await expect(page.locator("main h1")).toBeVisible();

  const ajouter = page.getByRole("button", { name: "Ajouter au panier" });
  await expect(ajouter).toBeEnabled();
  expect(await violations(page)).toEqual([]);

  // 3. Ajout au panier puis panier
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
  await tabJusqua(page, ajouter);
  await page.keyboard.press("Enter");
  const voirPanier = page.getByRole("link", { name: "Voir le panier" });
  await expect(voirPanier).toBeVisible();
  await tabJusqua(page, voirPanier);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/fr\/panier$/);
  const commander = page.getByRole("link", { name: "Passer la commande" });
  await expect(commander).toBeVisible();
  expect(await violations(page)).toEqual([]);

  // 4. Commande
  await tabJusqua(page, commander);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/fr\/panier\/commande$/);
  const main = page.locator("main");
  const email = main.getByLabel(/Adresse e-mail/);
  await expect(email).toBeVisible();
  expect(await violations(page)).toEqual([]);

  await tabJusqua(page, email);
  await page.keyboard.type("claire@exemple.ch");
  for (const [libelle, valeur] of [
    [/Nom et prénom/, "Claire Dupont"],
    [/Rue et numéro/, "Rue du Rhône 1"],
    [/NPA/, "1204"],
    [/Localité/, "Genève"],
  ] as const) {
    await tabJusqua(page, main.getByLabel(libelle));
    await page.keyboard.type(valeur);
  }
  const cgv = main.getByRole("checkbox");
  await tabJusqua(page, cgv);
  await page.keyboard.press("Space");
  await expect(cgv).toBeChecked();
  const continuer = page.getByRole("button", {
    name: "Continuer vers le paiement",
  });
  await tabJusqua(page, continuer);
  await page.keyboard.press("Enter");

  // 5. Paiement
  await expect(page).toHaveURL(/\/fr\/panier\/paiement\?reference=/);
  const payer = page.getByRole("button", { name: /Payer|virement/i }).first();
  await expect(payer).toBeVisible();
  expect(await violations(page)).toEqual([]);
  await tabJusqua(page, payer);
});
