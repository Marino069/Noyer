"use client";

import { useId } from "react";
import type { ReactNode } from "react";
import { FieldError, FieldHint, type FieldMessages } from "./Field";
import styles from "./Field.module.css";

type RadioGroupProps = Omit<FieldMessages, "label"> & {
  /** Intitulé du groupe (`<legend>`), toujours visible. */
  legend: ReactNode;
  name: string;
  options: { value: string; label: ReactNode; disabled?: boolean }[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
};

/** Groupe de boutons radio dans un `<fieldset>` : aide et erreur reliées au groupe via aria-describedby. */
export function RadioGroup({
  legend,
  name,
  options,
  value,
  defaultValue,
  onChange,
  hint,
  error,
  required,
  disabled,
  className,
}: RadioGroupProps) {
  const baseId = useId();
  const hintId = hint ? `${baseId}-hint` : undefined;
  const errorId = error ? `${baseId}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;
  const controlled = value !== undefined;

  return (
    <fieldset
      className={[styles.choiceGroup, className].filter(Boolean).join(" ")}
      aria-describedby={describedBy}
      disabled={disabled}
    >
      <legend className={styles.legend}>
        {legend}
        {required ? <span aria-hidden="true"> *</span> : null}
      </legend>
      <div className={styles.choices}>
        {options.map((option, i) => (
          <label key={option.value} className={styles.choice}>
            <input
              type="radio"
              name={name}
              value={option.value}
              disabled={option.disabled}
              required={required && i === 0}
              {...(controlled
                ? { checked: value === option.value }
                : { defaultChecked: defaultValue === option.value })}
              onChange={() => onChange?.(option.value)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
      <FieldHint id={hintId}>{hint}</FieldHint>
      <FieldError id={errorId}>{error}</FieldError>
    </fieldset>
  );
}
