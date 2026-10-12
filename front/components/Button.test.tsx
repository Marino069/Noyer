import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./Button";

describe("Button", () => {
  it("rend un <button type=button> avec son libellé", () => {
    render(<Button>Ajouter</Button>);
    const button = screen.getByRole("button", { name: "Ajouter" });
    expect(button).toHaveAttribute("type", "button");
  });

  it("appelle onClick au clic", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Ajouter</Button>);
    await userEvent.click(screen.getByRole("button", { name: "Ajouter" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("est inactif et occupé pendant le chargement", async () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Ajouter
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Ajouter" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("rend un lien si href est fourni", () => {
    render(<Button href="/boutique">Boutique</Button>);
    expect(screen.getByRole("link", { name: "Boutique" })).toHaveAttribute(
      "href",
      "/boutique",
    );
  });
});
