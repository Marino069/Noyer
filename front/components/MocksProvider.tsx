"use client";

import { useEffect, useState } from "react";
import { API_MOCKS } from "@/lib/env";
import { startMocks } from "@/lib/mocks";

// Attend que le service worker MSW soit prêt avant d'afficher l'app, pour que
// aucune requête partie du navigateur n'échappe aux mocks.
export function MocksProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(!API_MOCKS);

  useEffect(() => {
    if (!API_MOCKS) return;
    let cancelled = false;
    startMocks().then(() => !cancelled && setReady(true));
    return () => {
      cancelled = true;
    };
  }, []);

  return ready ? children : null;
}
