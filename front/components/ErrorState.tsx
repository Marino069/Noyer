import type { ApiError } from "@/lib/api";

type Props = {
  title: string;
  message?: string;
  retryLabel?: string;
  onRetry?: () => void;
  error?: ApiError;
};

/** État d'erreur affichable pour un `ApiResult` en échec ; remplace tout crash. */
export function ErrorState({
  title,
  message,
  retryLabel,
  onRetry,
  error,
}: Props) {
  return (
    <div role="alert">
      <h2>{title}</h2>
      <p>{message ?? error?.message}</p>
      {onRetry && retryLabel ? (
        <button type="button" onClick={onRetry}>
          {retryLabel}
        </button>
      ) : null}
    </div>
  );
}
