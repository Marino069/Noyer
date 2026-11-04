"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { api, type ModeLivraison, type Panier } from "@/lib/api";
import { publishCart } from "@/lib/cart";
import { formatPrice, formatVatRate, interpolate } from "@/lib/format";
import { startMocks } from "@/lib/mocks";
import { Button } from "./Button";
import { Checkbox } from "./Checkbox";
import { ErrorState } from "./ErrorState";
import { Input } from "./Input";
import { RadioGroup } from "./RadioGroup";
import styles from "./Checkout.module.css";

export type CheckoutTextes = {
  title: string;
  loading: string;
  errorTitle: string;
  errorMessage: string;
  retry: string;
  emptyTitle: string;
  emptyMessage: string;
  emptyCta: string;
  requiredNote: string;
  contact: string;
  email: string;
  emailHint: string;
  address: string;
  name: string;
  street: string;
  npa: string;
  npaHint: string;
  locality: string;
  country: string;
  countryCh: string;
  delivery: string;
  modeLivraison: string;
  modeRetrait: string;
  free: string;
  cgvBefore: string;
  cgvLink: string;
  cgvAfter: string;
  summary: string;
  shipping: string;
  total: string;
  totalVat: string;
  submit: string;
  errorSummary: string;
  errors: {
    email: string;
    name: string;
    street: string;
    npa: string;
    locality: string;
    cgv: string;
    expired: string;
    server: string;
  };
};

type Props = {
  locale: string;
  textes: CheckoutTextes;
  catalogueHref: string;
  cgvHref: string;
  /** Page du paiement (E5-04) : reçoit `?reference=` de la commande créée. */
  paiementHref: string;
};

type Etat =
  | { statut: "chargement" }
  | { statut: "erreur" }
  | { statut: "pret"; panier: Panier };

type Champ = "email" | "name" | "street" | "npa" | "locality" | "cgv";
type Erreurs = Partial<Record<Champ, string>>;

/** NPA suisse : 4 chiffres, de 1000 à 9999. */
export const NPA_SUISSE = /^[1-9]\d{3}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validerChamp(
  champ: Champ,
  valeur: string | boolean,
  textes: CheckoutTextes["errors"],
): string | undefined {
  const texte = typeof valeur === "string" ? valeur.trim() : "";
  switch (champ) {
    case "email":
      return EMAIL.test(texte) ? undefined : textes.email;
    case "npa":
      return NPA_SUISSE.test(texte) ? undefined : textes.npa;
    case "cgv":
      return valeur === true ? undefined : textes.cgv;
    default:
      return texte ? undefined : textes[champ];
  }
}

const CHAMPS: Champ[] = ["email", "name", "street", "npa", "locality", "cgv"];

/**
 * Checkout, étape 1 : coordonnées, adresse suisse, mode de réception et CGV.
 * Les frais de livraison viennent du panier ; le retrait à l'atelier est gratuit.
 */
export function Checkout({
  locale,
  textes,
  catalogueHref,
  cgvHref,
  paiementHref,
}: Props) {
  const router = useRouter();
  const [etat, setEtat] = useState<Etat>({ statut: "chargement" });
  const [tentative, setTentative] = useState(0);
  const [mode, setMode] = useState<ModeLivraison>("livraison");
  const [erreurs, setErreurs] = useState<Erreurs>({});
  const [envoi, setEnvoi] = useState(false);
  const [erreurServeur, setErreurServeur] = useState("");
  const envoiEnCours = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    startMocks()
      .catch(() => {
        // Les mocks ne sont qu'un confort de développement.
      })
      .then(() => api.panier({ signal: controller.signal }))
      .then((result) => {
        if (controller.signal.aborted) return;
        if (result.ok) {
          publishCart(result.data);
          setEtat({ statut: "pret", panier: result.data });
        } else {
          setEtat({ statut: "erreur" });
        }
      });
    return () => controller.abort();
  }, [tentative]);

  if (etat.statut === "chargement") {
    return (
      <div className={styles.page}>
        <h1 className={styles.title}>{textes.title}</h1>
        <p role="status">{textes.loading}</p>
      </div>
    );
  }

  if (etat.statut === "erreur") {
    return (
      <div className={styles.page}>
        <h1 className={styles.title}>{textes.title}</h1>
        <ErrorState
          title={textes.errorTitle}
          message={textes.errorMessage}
          retryLabel={textes.retry}
          onRetry={() => {
            setEtat({ statut: "chargement" });
            setTentative((n) => n + 1);
          }}
        />
      </div>
    );
  }

  const { panier } = etat;

  if (panier.lignes.length === 0) {
    return (
      <div className={styles.page}>
        <h1 className={styles.title}>{textes.title}</h1>
        <div className={styles.empty}>
          <h2>{textes.emptyTitle}</h2>
          <p>{textes.emptyMessage}</p>
          <Button href={catalogueHref}>{textes.emptyCta}</Button>
        </div>
      </div>
    );
  }

  // Le retrait à l'atelier est gratuit ; sinon les frais sont ceux du panier.
  const fraisLivraison = panier.frais_livraison_centimes;
  const frais = mode === "retrait_atelier" ? 0 : fraisLivraison;
  const sousTotal = panier.total_centimes - fraisLivraison;
  const total = sousTotal + frais;
  const libelleFrais = (centimes: number) =>
    centimes === 0 ? textes.free : formatPrice(centimes, locale);

  function lire(form: HTMLFormElement, champ: Champ): string | boolean {
    const el = form.elements.namedItem(champ);
    if (el instanceof HTMLInputElement) {
      return el.type === "checkbox" ? el.checked : el.value;
    }
    return "";
  }

  function validerEnLigne(champ: Champ, form: HTMLFormElement) {
    const erreur = validerChamp(champ, lire(form, champ), textes.errors);
    setErreurs((prev) => ({ ...prev, [champ]: erreur }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Double clic : une seule commande, le state `envoi` n'est pas encore à jour.
    if (envoiEnCours.current) return;
    const form = event.currentTarget;
    setErreurServeur("");

    const prochaines: Erreurs = {};
    for (const champ of CHAMPS) {
      prochaines[champ] = validerChamp(champ, lire(form, champ), textes.errors);
    }
    setErreurs(prochaines);
    const premier = CHAMPS.find((c) => prochaines[c]);
    if (premier) {
      (form.elements.namedItem(premier) as HTMLElement | null)?.focus();
      return;
    }

    const valeur = (c: Champ) => String(lire(form, c)).trim();
    envoiEnCours.current = true;
    setEnvoi(true);
    const result = await api.creerCommande({
      email: valeur("email"),
      adresse_livraison: {
        nom: valeur("name"),
        rue: valeur("street"),
        npa: valeur("npa"),
        localite: valeur("locality"),
        pays: "CH",
      },
      adresse_facturation: null,
      mode_livraison: mode,
      cgv_acceptees: true,
    });
    if (result.ok) {
      const reference = encodeURIComponent(result.data.reference);
      router.push(`${paiementHref}?reference=${reference}`);
      return;
    }
    envoiEnCours.current = false;
    setEnvoi(false);
    setErreurServeur(
      result.error.code === "reservation_expiree"
        ? textes.errors.expired
        : textes.errors.server,
    );
  }

  const taux = formatVatRate(panier.taux_tva, locale);
  const nbErreurs = CHAMPS.filter((c) => erreurs[c]).length;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{textes.title}</h1>
      <div className={styles.layout}>
        <form
          className={styles.form}
          onSubmit={onSubmit}
          noValidate
          aria-label={textes.title}
        >
          <p className={styles.note}>{textes.requiredNote}</p>
          <div role="alert" className={styles.status}>
            {nbErreurs > 0 ? <p>{textes.errorSummary}</p> : null}
          </div>

          <fieldset className={styles.group}>
            <legend>{textes.contact}</legend>
            <Input
              name="email"
              type="email"
              autoComplete="email"
              required
              label={textes.email}
              hint={textes.emailHint}
              error={erreurs.email}
              onBlur={(e) => validerEnLigne("email", e.currentTarget.form!)}
            />
          </fieldset>

          <fieldset className={styles.group}>
            <legend>{textes.address}</legend>
            <Input
              name="name"
              autoComplete="name"
              required
              label={textes.name}
              error={erreurs.name}
              onBlur={(e) => validerEnLigne("name", e.currentTarget.form!)}
            />
            <Input
              name="street"
              autoComplete="address-line1"
              required
              label={textes.street}
              error={erreurs.street}
              onBlur={(e) => validerEnLigne("street", e.currentTarget.form!)}
            />
            <div className={styles.row}>
              <Input
                name="npa"
                autoComplete="postal-code"
                inputMode="numeric"
                maxLength={4}
                required
                label={textes.npa}
                hint={textes.npaHint}
                error={erreurs.npa}
                onBlur={(e) => validerEnLigne("npa", e.currentTarget.form!)}
              />
              <Input
                name="locality"
                autoComplete="address-level2"
                required
                label={textes.locality}
                error={erreurs.locality}
                onBlur={(e) =>
                  validerEnLigne("locality", e.currentTarget.form!)
                }
              />
            </div>
            <Input
              name="country"
              autoComplete="country-name"
              label={textes.country}
              value={textes.countryCh}
              readOnly
            />
          </fieldset>

          <RadioGroup
            legend={textes.delivery}
            name="mode_livraison"
            value={mode}
            onChange={(v) => setMode(v as ModeLivraison)}
            options={[
              {
                value: "livraison",
                label: interpolate(textes.modeLivraison, {
                  frais: libelleFrais(fraisLivraison),
                }),
              },
              {
                value: "retrait_atelier",
                label: interpolate(textes.modeRetrait, {
                  frais: libelleFrais(0),
                }),
              },
            ]}
          />

          <Checkbox
            name="cgv"
            required
            label={
              <>
                {textes.cgvBefore}
                <Link href={cgvHref} target="_blank" rel="noopener">
                  {textes.cgvLink}
                </Link>
                {textes.cgvAfter}
              </>
            }
            error={erreurs.cgv}
            onChange={(e) => validerEnLigne("cgv", e.currentTarget.form!)}
          />

          <div role="alert" className={styles.status}>
            {erreurServeur ? <p>{erreurServeur}</p> : null}
          </div>
          <Button type="submit" loading={envoi}>
            {textes.submit}
          </Button>
        </form>

        <section className={styles.summary} aria-labelledby="checkout-recap">
          <h2 id="checkout-recap">{textes.summary}</h2>
          <dl className={styles.totaux}>
            <div>
              <dt>{textes.shipping}</dt>
              <dd data-testid="frais">{libelleFrais(frais)}</dd>
            </div>
            <div className={styles.total}>
              <dt>{textes.total}</dt>
              <dd data-testid="total">{formatPrice(total, locale)}</dd>
            </div>
          </dl>
          <p className={styles.vatNote}>
            {interpolate(textes.totalVat, { rate: taux })}
          </p>
        </section>
      </div>
    </div>
  );
}
