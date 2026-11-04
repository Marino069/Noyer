"use client";

import { useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { Button } from "./Button";
import { Checkbox } from "./Checkbox";
import { Input } from "./Input";
import styles from "./AlerteSerie.module.css";

export type AlerteSerieTextes = {
  title: string;
  message: string;
  email: string;
  consent: string;
  submit: string;
  success: string;
  errorEmail: string;
  errorConsent: string;
  errorServer: string;
};

type Status = "idle" | "loading" | "success" | "error";

/**
 * Série épuisée : propose d'être prévenu d'une prochaine série.
 * Le contrat d'API n'a pas de route dédiée : l'inscription passe par `POST /newsletter/`
 * (consentement explicite, nLPD).
 */
export function AlerteSerie({ textes }: { textes: AlerteSerieTextes }) {
  const [status, setStatus] = useState<Status>("idle");
  const [emailError, setEmailError] = useState<string>();
  const [consentError, setConsentError] = useState<string>();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const email = String(data.get("email") ?? "").trim();
    const consentement = data.get("consentement") === "on";

    const nextEmail = (form.elements.namedItem("email") as HTMLInputElement)
      .validity.valid
      ? undefined
      : textes.errorEmail;
    const nextConsent = consentement ? undefined : textes.errorConsent;
    setEmailError(nextEmail);
    setConsentError(nextConsent);
    if (nextEmail || nextConsent) return;

    setStatus("loading");
    const result = await api.newsletter({ email, consentement });
    if (result.ok) {
      form.reset();
      setStatus("success");
    } else {
      setStatus("error");
    }
  }

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      <h3 className={styles.title}>{textes.title}</h3>
      <p className={styles.message}>{textes.message}</p>
      <Input
        name="email"
        type="email"
        autoComplete="email"
        required
        label={textes.email}
        error={emailError}
      />
      <Checkbox
        name="consentement"
        label={textes.consent}
        error={consentError}
      />
      <Button type="submit" loading={status === "loading"}>
        {textes.submit}
      </Button>
      <div role="status">
        {status === "success" ? <p>{textes.success}</p> : null}
      </div>
      <div role="alert">
        {status === "error" ? <p>{textes.errorServer}</p> : null}
      </div>
    </form>
  );
}
