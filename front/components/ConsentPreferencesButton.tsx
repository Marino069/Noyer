"use client";

import { openConsentPreferences } from "@/lib/consent";
import styles from "./Footer.module.css";

/** Lien du pied de page qui rouvre les préférences de consentement. */
export function ConsentPreferencesButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      className={`${styles.link} ${styles.linkButton}`}
      onClick={openConsentPreferences}
    >
      {label}
    </button>
  );
}
