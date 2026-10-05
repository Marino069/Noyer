import type { ComponentProps } from "react";
import { Field, useFieldIds, type FieldMessages } from "./Field";
import styles from "./Field.module.css";

type InputProps = FieldMessages & Omit<ComponentProps<"input">, "children">;

/** Champ texte (text, email, tel, password…) avec label, aide et erreur. */
export function Input({
  label,
  hint,
  error,
  className,
  id: idProp,
  ...rest
}: InputProps) {
  const messages = { label, hint, error };
  const { id, hintId, errorId, aria } = useFieldIds(idProp, messages);
  return (
    <Field
      id={id}
      hintId={hintId}
      errorId={errorId}
      messages={messages}
      required={rest.required}
      className={className}
    >
      <input {...rest} {...aria} id={id} className={styles.control} />
    </Field>
  );
}
