import Link from "next/link";
import styles from "./Logo.module.css";

/** Logo isolé : nom en Fraunces (placeholder). À remplacer ici quand le nom/logo final sera décidé (brief §08). */
export function Logo({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className={styles.logo} aria-label={label}>
      Noyer
    </Link>
  );
}
