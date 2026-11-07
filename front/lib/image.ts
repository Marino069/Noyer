import type { ImagePrincipale } from "@/lib/api/types";

export type Vignette = {
  src: string;
  srcSet?: string;
  width?: number;
  height?: number;
  alt: string;
};

/** Image affichable : sources WebP si présentes, sinon repli sur `url`, sinon null. */
export function vignetteDe(
  image: ImagePrincipale | null | undefined,
): Vignette | null {
  if (!image) return null;
  const sources = [...(image.sources ?? [])].sort(
    (a, b) => a.largeur - b.largeur,
  );
  const base = {
    alt: image.alt,
    width: image.largeur_origine,
    height: image.hauteur_origine,
  };
  if (sources.length > 0) {
    return {
      ...base,
      src: sources[0].url,
      srcSet: sources.map((s) => `${s.url} ${s.largeur}w`).join(", "),
    };
  }
  return image.url ? { ...base, src: image.url } : null;
}
