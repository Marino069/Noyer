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
type Champ =
  "nom" | "email" | "telephone" | "creneau" | "message" | "consentement";
type Errors = Partial<Record<Champ, string>>;

const PHONE = /^[+()\d\s./-]{6,25}$/;

type Props = {
  dictionary: Dictionary["rendezVous"]["form"];
  /** Objet transmis à l'atelier (l'API de contact n'a pas de champ dédié : il ouvre le message). */
  objet: string;
  labels: Dictionary["rendezVous"]["labels"];
};

/**
 * Formulaire de rendez-vous : envoyé via `POST /contact/` (contrat inchangé). L'objet, le téléphone et le
 * créneau sont placés en tête du message. Même champ piège anti-robot et même consentement nLPD que le contact.
 */
export function RendezVousForm({ dictionary, objet, labels }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<Errors>({});

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const nom = String(data.get("nom") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const telephone = String(data.get("telephone") ?? "").trim();
    const creneau = String(data.get("creneau") ?? "").trim();
    const message = String(data.get("message") ?? "").trim();
    const consentement = data.get("consentement") === "on";
    const siteWeb = String(data.get("site_web") ?? "");

    const next: Errors = {
      nom: nom ? undefined : dictionary.errors.name,
      email: (form.elements.namedItem("email") as HTMLInputElement).validity
        .valid
        ? undefined
        : dictionary.errors.email,
      telephone:
        !telephone || PHONE.test(telephone)
          ? undefined
          : dictionary.errors.phone,
      creneau: creneau ? undefined : dictionary.errors.slot,
      message: message ? undefined : dictionary.errors.message,
      consentement: consentement ? undefined : dictionary.errors.consent,
    };
    setErrors(next);
    const premiere = (Object.keys(next) as Champ[]).find((c) => next[c]);
    if (premiere) {
      setStatus("idle");
      (form.elements.namedItem(premiere) as HTMLElement | null)?.focus();
      return;
    }

    const lignes = [
      `${labels.objet} : ${objet}`,
      `${labels.slot} : ${creneau}`,
      ...(telephone ? [`${labels.phone} : ${telephone}`] : []),
      "",
      message,
    ];
    setStatus("loading");
    const result = await api.contact({
      nom,
      email,
      message: lignes.join("\n"),
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
      <Input
        name="telephone"
        type="tel"
        autoComplete="tel"
        label={dictionary.phone}
        error={errors.telephone}
      />
      <Input
        name="creneau"
        required
        label={dictionary.slot}
        hint={dictionary.slotHint}
        error={errors.creneau}
      />
      <Textarea
        name="message"
        rows={5}
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
