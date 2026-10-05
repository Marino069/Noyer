import type { ComponentProps } from "react";
import { Field, useFieldIds, type FieldMessages } from "./Field";
import styles from "./Field.module.css";

type TextareaProps = FieldMessages &
  Omit<ComponentProps<"textarea">, "children">;

/** Zone de texte multiligne avec label, aide et erreur. */
export function Textarea({
  label,
  hint,
  error,
  className,
  id: idProp,
  ...rest
}: TextareaProps) {
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
      <textarea {...rest} {...aria} id={id} className={styles.control} />
    </Field>
  );
}
