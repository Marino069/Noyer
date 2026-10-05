import { useId } from "react";
import type { ReactNode } from "react";
import styles from "./Field.module.css";

export type FieldMessages = {
  /** Libellé toujours visible (jamais un simple placeholder). */
  label: ReactNode;
  /** Message d'aide, relié au champ via `aria-describedby`. */
  hint?: ReactNode;
  /** Message d'erreur : annoncé par les lecteurs d'écran, relié via `aria-describedby`. */
  error?: ReactNode;
};

/** Identifiants et attributs ARIA communs à tous les champs. */
export function useFieldIds(idProp: string | undefined, m: FieldMessages) {
  const generated = useId();
  const id = idProp ?? generated;
  const hintId = m.hint ? `${id}-hint` : undefined;
  const errorId = m.error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;
  return {
    id,
    hintId,
    errorId,
    aria: {
      "aria-describedby": describedBy,
      "aria-invalid": m.error ? (true as const) : undefined,
    },
  };
}

export function FieldHint({
  id,
  children,
}: {
  id?: string;
  children?: ReactNode;
}) {
  return children ? (
    <p id={id} className={styles.hint}>
      {children}
    </p>
  ) : null;
}

/** Le conteneur role="alert" est toujours rendu : le contenu inséré est annoncé. */
export function FieldError({
  id,
  children,
}: {
  id?: string;
  children?: ReactNode;
}) {
  return (
    <div role="alert">
      {children ? (
        <p id={id} className={styles.error}>
          <span aria-hidden="true" className={styles.errorIcon}>
            !
          </span>
          <span>{children}</span>
        </p>
      ) : null}
    </div>
  );
}

/** Enveloppe label + contrôle + aide + erreur pour input, textarea et select. */
export function Field({
  id,
  hintId,
  errorId,
  messages,
  required,
  className,
  children,
}: {
  id: string;
  hintId?: string;
  errorId?: string;
  messages: FieldMessages;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={[styles.field, className].filter(Boolean).join(" ")}>
      <label htmlFor={id} className={styles.label}>
        {messages.label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      {children}
      <FieldHint id={hintId}>{messages.hint}</FieldHint>
      <FieldError id={errorId}>{messages.error}</FieldError>
    </div>
  );
}
