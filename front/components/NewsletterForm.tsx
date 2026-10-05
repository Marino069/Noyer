"use client";

import { useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import type { Dictionary } from "@/i18n/get-dictionary";
import { Button } from "./Button";
import { Checkbox } from "./Checkbox";
import { Input } from "./Input";
import styles from "./NewsletterForm.module.css";

type Status = "idle" | "loading" | "success" | "error";

/** Inscription newsletter avec consentement explicite (nLPD) ; états chargement, succès et erreur. */
export function NewsletterForm({
  dictionary,
}: {
  dictionary: Dictionary["newsletter"];
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [emailError, setEmailError] = useState<string>();
  const [consentError, setConsentError] = useState<string>();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const email = String(data.get("email") ?? "").trim();
    const consentement = data.get("consentement") === "on";

    const nextEmailError = form.email.validity.valid
      ? undefined
      : dictionary.errors.email;
    const nextConsentError = consentement
      ? undefined
      : dictionary.errors.consent;
    setEmailError(nextEmailError);
    setConsentError(nextConsentError);
    if (nextEmailError || nextConsentError) {
      setStatus("idle");
      return;
    }

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
      <h2 className={styles.title}>{dictionary.title}</h2>
      <p className={styles.intro}>{dictionary.intro}</p>
      <Input
        name="email"
        type="email"
        autoComplete="email"
        required
        label={dictionary.email}
        error={emailError}
      />
      <Checkbox
        name="consentement"
        label={dictionary.consent}
        error={consentError}
      />
      <Button type="submit" loading={status === "loading"}>
        {dictionary.submit}
      </Button>
      <div role="status" className={styles.status}>
        {status === "success" ? <p>{dictionary.success}</p> : null}
      </div>
      <div role="alert" className={styles.status}>
        {status === "error" ? <p>{dictionary.errors.server}</p> : null}
      </div>
    </form>
  );
}
