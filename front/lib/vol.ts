/** Attribut posé sur l'icône du panier : cible du vol de la vignette. */
export const CIBLE_PANIER = "data-panier-icone";

export const DUREE_VOL_MS = 600;

/** `prefers-reduced-motion: reduce` : aucune animation, état final direct. */
export function mouvementReduit(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Fait voler une copie de la vignette de `depuis` jusqu'à l'icône du panier
 * (transform + opacity uniquement). Résout quand le vol est fini ; résout
 * aussitôt s'il n'y a rien à animer (mouvement réduit, pas d'image, pas d'icône).
 */
export function voler(depuis: HTMLElement, src: string | null): Promise<void> {
  if (mouvementReduit() || !src) return Promise.resolve();
  const cible = document.querySelector<HTMLElement>(`[${CIBLE_PANIER}]`);
  if (!cible || typeof Element.prototype.animate !== "function") {
    return Promise.resolve();
  }
  const a = depuis.getBoundingClientRect();
  const b = cible.getBoundingClientRect();
  if (b.width === 0 && b.height === 0) return Promise.resolve();

  const taille = 56;
  const img = document.createElement("img");
  img.src = src;
  img.alt = "";
  img.setAttribute("aria-hidden", "true");
  Object.assign(img.style, {
    position: "fixed",
    left: "0",
    top: "0",
    width: `${taille}px`,
    height: `${taille}px`,
    objectFit: "cover",
    borderRadius: "var(--radius)",
    pointerEvents: "none",
    zIndex: "70",
    willChange: "transform, opacity",
  });
  document.body.appendChild(img);

  const x0 = a.left + a.width / 2 - taille / 2;
  const y0 = a.top + a.height / 2 - taille / 2;
  const x1 = b.left + b.width / 2 - taille / 2;
  const y1 = b.top + b.height / 2 - taille / 2;

  const animation = img.animate(
    [
      { transform: `translate(${x0}px, ${y0}px) scale(1)`, opacity: 1 },
      { transform: `translate(${x1}px, ${y1}px) scale(0.3)`, opacity: 0.2 },
    ],
    { duration: DUREE_VOL_MS, easing: "cubic-bezier(0.4, 0, 0.2, 1)" },
  );
  return animation.finished
    .then(() => undefined)
    .catch(() => undefined)
    .finally(() => img.remove());
}
