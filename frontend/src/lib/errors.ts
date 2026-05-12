export function readErrorMessage(error: unknown): string | undefined {
  const value = error as { response?: { data?: { message?: unknown } } } | null | undefined;
  const message = value?.response?.data?.message;
  return typeof message === "string" ? message : undefined;
}
