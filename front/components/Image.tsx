import NextImage, { type ImageProps as NextImageProps } from "next/image";
import styles from "./Image.module.css";

/** Breakpoints du brief §07 : mobile < 600, tablette 600-900, desktop > 900. */
const DEFAULT_SIZES =
  "(max-width: 600px) 100vw, (max-width: 900px) 90vw, 1152px";

type AltProps =
  /** Texte alternatif descriptif, obligatoire pour toute photo produit ou matière. */
  | { alt: string; decorative?: never }
  /** Image purement décorative : seul moyen d'obtenir un alt vide. */
  | { decorative: true; alt?: never };

type ImageProps = Omit<
  NextImageProps,
  | "alt"
  | "fill"
  | "width"
  | "height"
  | "priority"
  | "preload"
  | "loading"
  | "placeholder"
  | "blurDataURL"
  | "style"
> &
  AltProps & {
    /** Dimensions intrinsèques : réservent le ratio avant chargement (pas de décalage de mise en page). */
    width: number;
    height: number;
    /** Image du hero uniquement : chargée en priorité. Sinon, lazy loading. */
    hero?: boolean;
  };

/**
 * Wrapper de next/image : AVIF puis WebP (voir next.config.ts), srcset et `sizes` calés
 * sur les breakpoints, lazy loading par défaut, placeholder ivoire.
 */
export function Image({
  alt,
  decorative,
  hero = false,
  sizes = DEFAULT_SIZES,
  className,
  ...rest
}: ImageProps) {
  return (
    <NextImage
      {...rest}
      alt={decorative ? "" : alt}
      sizes={sizes}
      quality={80}
      {...(hero ? { preload: true, loading: "eager" } : { loading: "lazy" })}
      className={className ? `${styles.image} ${className}` : styles.image}
    />
  );
}
