export type Consentement = "accepted" | "refused";

export const CONSENT_KEY = "noyer-consent";
export const CONSENT_OPEN_EVENT = "noyer:consent-preferences";
const CONSENT_CHANGE_EVENT = "noyer:consent-change";

/** Choix mémorisé du visiteur, ou null s'il n'a pas encore choisi. */
export function readConsent(): Consentement | null {
  try {
    const value = window.localStorage.getItem(CONSENT_KEY);
    return value === "accepted" || value === "refused" ? value : null;
  } catch {
    return null;
  }
}

export function writeConsent(value: Consentement): void {
  try {
    window.localStorage.setItem(CONSENT_KEY, value);
  } catch {
    // stockage indisponible : le choix vaut pour la page courante seulement
  }
  window.dispatchEvent(new Event(CONSENT_CHANGE_EVENT));
}

export function subscribeConsent(callback: () => void): () => void {
  window.addEventListener(CONSENT_CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CONSENT_CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

/** Demande l'ouverture du panneau de préférences (depuis le pied de page). */
export function openConsentPreferences(): void {
  window.dispatchEvent(new Event(CONSENT_OPEN_EVENT));
}
