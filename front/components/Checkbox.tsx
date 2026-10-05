import type { ComponentProps } from "react";
import {
  FieldError,
  FieldHint,
  useFieldIds,
  type FieldMessages,
} from "./Field";
import styles from "./Field.module.css";

type CheckboxProps = FieldMessages &
  Omit<ComponentProps<"input">, "type" | "children">;

/** Case à cocher unique (consentement, newsletter, CGV…) avec label, aide et erreur. */
export function Checkbox({
  label,
  hint,
  error,
  className,
  id: idProp,
  ...rest
}: CheckboxProps) {
  const { id, hintId, errorId, aria } = useFieldIds(idProp, {
    label,
    hint,
    error,
  });
  return (
    <div className={[styles.choiceGroup, className].filter(Boolean).join(" ")}>
      <label htmlFor={id} className={styles.choice}>
        <input {...rest} {...aria} id={id} type="checkbox" />
        <span>{label}</span>
      </label>
      <FieldHint id={hintId}>{hint}</FieldHint>
      <FieldError id={errorId}>{error}</FieldError>
    </div>
  );
}
