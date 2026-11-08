import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Cote } from "./Cote";

type Cb = (e: { isIntersecting: boolean }[]) => void;

let cb: Cb | undefined;
let disconnect: ReturnType<typeof vi.fn>;
let animate: ReturnType<typeof vi.fn>;
let frames: FrameRequestCallback[];

function mockEnv(reduced: boolean) {
  cb = undefined;
  disconnect = vi.fn();
  animate = vi.fn();
  frames = [];
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(c: Cb) {
        cb = c;
      }
      observe() {}
      disconnect = disconnect;
    },
  );
  vi.stubGlobal("matchMedia", () => ({ matches: reduced }));
  vi.stubGlobal("requestAnimationFrame", (f: FrameRequestCallback) => {
    frames.push(f);
    return frames.length;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {});
  HTMLElement.prototype.animate = animate as never;
}

afterEach(() => vi.unstubAllGlobals());

describe("Cote animée", () => {
  it("garde la valeur finale dans le HTML dès le départ", () => {
    mockEnv(false);
    render(<Cote label="H 42 cm" />);
    expect(screen.getByText("H 42 cm")).toBeInTheDocument();
  });

  it("dessine le trait et compte de 0 à la valeur, une seule fois", () => {
    mockEnv(false);
    render(<Cote label="Ø 28 cm" />);
    cb?.([{ isIntersecting: true }]);
    expect(animate).toHaveBeenCalledTimes(1);
    expect(disconnect).toHaveBeenCalled();
    expect(screen.getByText("Ø 0 cm")).toBeInTheDocument();
    frames[0](performance.now() + 5000);
    expect(screen.getByText("Ø 28 cm")).toBeInTheDocument();
  });

  it("n'anime pas tant que la cote n'est pas à l'écran", () => {
    mockEnv(false);
    render(<Cote label="H 42 cm" />);
    cb?.([{ isIntersecting: false }]);
    expect(animate).not.toHaveBeenCalled();
    expect(screen.getByText("H 42 cm")).toBeInTheDocument();
  });

  it("reduced-motion : aucune animation, cote affichée directement", () => {
    mockEnv(true);
    render(<Cote label="H 42 cm" />);
    expect(cb).toBeUndefined();
    expect(animate).not.toHaveBeenCalled();
    expect(screen.getByText("H 42 cm")).toBeInTheDocument();
  });
});
