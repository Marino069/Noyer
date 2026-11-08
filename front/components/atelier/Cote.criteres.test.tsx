import { render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Cote } from "./Cote";

// Critères de #300 [E9-04] Cotes qui se tracent.

type Entry = { isIntersecting: boolean };
let callbacks: ((e: Entry[]) => void)[];
let animate: ReturnType<typeof vi.fn>;
let rafQueue: FrameRequestCallback[];

function env({ reduced = false, io = true } = {}) {
  callbacks = [];
  rafQueue = [];
  animate = vi.fn();
  if (io) {
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        active = true;
        constructor(cb: (e: Entry[]) => void) {
          callbacks.push((e) => {
            if (this.active) cb(e);
          });
        }
        observe() {}
        unobserve() {}
        disconnect() {
          this.active = false;
        }
      },
    );
  } else {
    vi.stubGlobal("IntersectionObserver", undefined);
  }
  vi.stubGlobal("matchMedia", () => ({
    matches: reduced,
    addEventListener() {},
    removeEventListener() {},
  }));
  vi.stubGlobal("requestAnimationFrame", (f: FrameRequestCallback) => {
    rafQueue.push(f);
    return rafQueue.length;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {});
  HTMLElement.prototype.animate = animate as never;
}

const enter = () => callbacks.forEach((cb) => cb([{ isIntersecting: true }]));

afterEach(() => vi.unstubAllGlobals());

describe("E9-04 — une seule fois par image", () => {
  it("entrer à l'écran plusieurs fois ne relance pas l'animation", () => {
    env();
    render(<Cote label="H 42 cm" />);
    enter();
    enter();
    expect(animate).toHaveBeenCalledTimes(1);
  });

  it("un re-rendu avec le même libellé ne relance pas l'animation", () => {
    env();
    const { rerender } = render(<Cote label="H 42 cm" />);
    enter();
    rerender(<Cote label="H 42 cm" className="autre" />);
    enter();
    expect(animate).toHaveBeenCalledTimes(1);
  });

  it("le compteur part de 0 puis finit exactement sur la valeur", () => {
    env();
    render(<Cote label="H 42 cm" orientation="vertical" />);
    enter();
    expect(screen.getByText("H 0 cm")).toBeInTheDocument();
    rafQueue.shift()?.(performance.now() + 10_000);
    expect(screen.getByText("H 42 cm")).toBeInTheDocument();
  });

  it("l'animation dure environ 800 ms", () => {
    env();
    render(<Cote label="Ø 28 cm" />);
    enter();
    const opts = animate.mock.calls[0][1] as { duration: number };
    expect(opts.duration).toBeGreaterThanOrEqual(600);
    expect(opts.duration).toBeLessThanOrEqual(1000);
  });
});

describe("E9-04 — valeur finale présente dans le HTML dès le départ", () => {
  it("le rendu serveur contient le libellé final", () => {
    const html = renderToString(<Cote label="H 42 cm" />);
    expect(html).toContain("H 42 cm");
    expect(html).not.toContain("H 0 cm");
  });

  it("le libellé est présent au premier rendu, avant toute intersection", () => {
    env();
    const { container } = render(<Cote label="Ø 28 cm" />);
    expect(container.textContent).toBe("Ø 28 cm");
  });

  it("sans IntersectionObserver, la cote reste affichée telle quelle", () => {
    env({ io: false });
    const { container } = render(<Cote label="Ø 28 cm" />);
    expect(container.textContent).toBe("Ø 28 cm");
    expect(animate).not.toHaveBeenCalled();
  });

  it("le démontage en cours de comptage restaure la valeur finale", () => {
    env();
    const { container, unmount } = render(<Cote label="H 42 cm" />);
    const root = container.firstElementChild as HTMLElement;
    enter();
    expect(root.textContent).toBe("H 0 cm");
    unmount();
    expect(root.textContent).toBe("H 42 cm");
  });
});

describe("E9-04 — reduced-motion : cotes affichées directement", () => {
  it("ne crée aucun observer et n'anime rien", () => {
    env({ reduced: true });
    const { container } = render(<Cote label="H 42 cm" />);
    expect(callbacks).toHaveLength(0);
    expect(animate).not.toHaveBeenCalled();
    expect(rafQueue).toHaveLength(0);
    expect(container.textContent).toBe("H 42 cm");
  });
});

describe("E9-04 — accessibilité", () => {
  it("la cote reste décorative (aria-hidden)", () => {
    env();
    const { container } = render(<Cote label="H 42 cm" />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });
});
