"use client";

import { useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import type { Dictionary } from "@/i18n/get-dictionary";
import { Button } from "./Button";
import { Checkbox } from "./Checkbox";
import styles from "./ContactForm.module.css";
import { Input } from "./Input";
import { Textarea } from "./Textarea";

type Status = "idle" | "loading" | "success" | "error";
type Errors = Partial<
  Record<"nom" | "email" | "message" | "consentement", string>
>;

/**
 * Formulaire de contact : champ piège (honeypot) plutôt que CAPTCHA visuel, consentement nLPD obligatoire.
 */
export function ContactForm({
  dictionary,
}: {
  dictionary: Dictionary["contact"]["form"];
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<Errors>({});

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const nom = String(data.get("nom") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const message = String(data.get("message") ?? "").trim();
    const consentement = data.get("consentement") === "on";
    const siteWeb = String(data.get("site_web") ?? "");

    const next: Errors = {
      nom: nom ? undefined : dictionary.errors.name,
      email: (form.elements.namedItem("email") as HTMLInputElement).validity
        .valid
        ? undefined
        : dictionary.errors.email,
      message: message ? undefined : dictionary.errors.message,
      consentement: consentement ? undefined : dictionary.errors.consent,
    };
    setErrors(next);
    if (Object.values(next).some(Boolean)) {
      setStatus("idle");
      return;
    }

    setStatus("loading");
    const result = await api.contact({
      nom,
      email,
      message,
      consentement,
      site_web: siteWeb,
    });
    if (result.ok) {
      form.reset();
      setStatus("success");
    } else {
      setStatus("error");
    }
  }

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      <Input
        name="nom"
        autoComplete="name"
        required
        label={dictionary.name}
        error={errors.nom}
      />
      <Input
        name="email"
        type="email"
        autoComplete="email"
        required
        label={dictionary.email}
        error={errors.email}
      />
      <Textarea
        name="message"
        rows={6}
        required
        label={dictionary.message}
        error={errors.message}
      />
      <div className={styles.trap} aria-hidden="true">
        <label>
          {dictionary.honeypot}
          <input type="text" name="site_web" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <Checkbox
        name="consentement"
        label={dictionary.consent}
        error={errors.consentement}
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
