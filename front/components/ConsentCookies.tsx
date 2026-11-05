"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Dictionary } from "@/i18n/get-dictionary";
import {
  CONSENT_OPEN_EVENT,
  readConsent,
  subscribeConsent,
  writeConsent,
} from "@/lib/consent";
import { Button } from "./Button";
import styles from "./ConsentCookies.module.css";

const TRACKER_ID = "noyer-tracker";

/**
 * Bannière de consentement (nLPD, brief §07). Le script de mesure n'est inséré
 * qu'après un « Accepter » ; « Refuser » a le même poids visuel et le même accès.
 * Les préférences se rouvrent via l'événement émis par le pied de page.
 */
export function ConsentCookies({
  dictionary,
  trackerSrc,
  demo = false,
}: {
  dictionary: Dictionary["consent"];
  /** URL du script de mesure ; vide = aucun tracker, rien à afficher. */
  trackerSrc?: string;
  /** Page de démonstration : toujours visible, dans le flux, sans effet. */
  demo?: boolean;
}) {
  const choice = useSyncExternalStore(
    subscribeConsent,
    readConsent,
    () => null,
  );
  const [reopened, setReopened] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const open = () => setReopened(true);
    window.addEventListener(CONSENT_OPEN_EVENT, open);
    return () => window.removeEventListener(CONSENT_OPEN_EVENT, open);
  }, []);

  useEffect(() => {
    if (!trackerSrc) return;
    const existing = document.getElementById(TRACKER_ID);
    if (choice === "accepted" && !existing) {
      const script = document.createElement("script");
      script.id = TRACKER_ID;
      script.src = trackerSrc;
      script.async = true;
      document.head.appendChild(script);
    } else if (choice !== "accepted" && existing) {
      existing.remove();
    }
  }, [choice, trackerSrc]);

  const visible =
    demo || (Boolean(trackerSrc) && (choice === null || reopened));

  useEffect(() => {
    if (reopened) titleRef.current?.focus();
  }, [reopened]);

  if (!visible) return null;

  const decide = (value: "accepted" | "refused") => {
    if (demo) return;
    writeConsent(value);
    setReopened(false);
  };

  return (
    <section
      className={demo ? `${styles.banner} ${styles.demo}` : styles.banner}
      aria-labelledby="consent-title"
      onKeyDown={(e) => {
        if (e.key === "Escape" && choice !== null) setReopened(false);
      }}
    >
      <h2
        id="consent-title"
        ref={titleRef}
        tabIndex={-1}
        className={styles.title}
      >
        {dictionary.title}
      </h2>
      <p className={styles.text}>{dictionary.text}</p>
      <div className={styles.actions}>
        <Button variant="secondary" onClick={() => decide("refused")}>
          {dictionary.refuse}
        </Button>
        <Button variant="secondary" onClick={() => decide("accepted")}>
          {dictionary.accept}
        </Button>
      </div>
    </section>
  );
}
