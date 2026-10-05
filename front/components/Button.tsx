import Link from "next/link";
import type { ComponentProps } from "react";
import styles from "./Button.module.css";

type Common = {
  variant?: "primary" | "secondary";
  /** Registre de la charte : "light" (défaut) ou "dark" (sections ponctuelles). */
  tone?: "light" | "dark";
  loading?: boolean;
  disabled?: boolean;
};

type ButtonProps = Common &
  Omit<ComponentProps<"button">, "disabled"> & { href?: undefined };
type LinkProps = Common &
  Omit<ComponentProps<typeof Link>, "href"> & { href: string };

/** Bouton primaire / secondaire ; rendu en `<a>` (next/link) si `href` est fourni, sinon `<button>`. */
export function Button(props: ButtonProps | LinkProps) {
  const {
    variant = "primary",
    tone = "light",
    loading = false,
    disabled = false,
    className,
    children,
    ...rest
  } = props;

  const inactive = disabled || loading;
  const classes = [
    styles.button,
    variant === "secondary" && styles.secondary,
    tone === "dark" && styles.dark,
    loading && styles.loading,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      {loading ? <span className={styles.spinner} aria-hidden="true" /> : null}
      <span className={styles.label}>{children}</span>
    </>
  );

  if (props.href !== undefined) {
    const { onClick, tabIndex, ...linkRest } = rest as Omit<
      LinkProps,
      keyof Common | "className" | "children"
    >;
    return (
      <Link
        {...linkRest}
        className={classes}
        aria-disabled={inactive || undefined}
        aria-busy={loading || undefined}
        tabIndex={inactive ? -1 : tabIndex}
        onClick={inactive ? (e) => e.preventDefault() : onClick}
      >
        {content}
      </Link>
    );
  }

  const { type = "button", ...buttonRest } = rest as Omit<
    ButtonProps,
    keyof Common | "className" | "children"
  >;
  return (
    <button
      {...buttonRest}
      type={type}
      className={classes}
      disabled={inactive}
      aria-busy={loading || undefined}
    >
      {content}
    </button>
  );
}
