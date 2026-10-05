import type { ComponentProps } from "react";
import { Field, useFieldIds, type FieldMessages } from "./Field";
import styles from "./Field.module.css";

type SelectProps = FieldMessages & ComponentProps<"select">;

/** Liste déroulante native avec label, aide et erreur ; les `<option>` sont passés en children. */
export function Select({
  label,
  hint,
  error,
  className,
  id: idProp,
  children,
  ...rest
}: SelectProps) {
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
      <select
        {...rest}
        {...aria}
        id={id}
        className={`${styles.control} ${styles.select}`}
      >
        {children}
      </select>
    </Field>
  );
}
