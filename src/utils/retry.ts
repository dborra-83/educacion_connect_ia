/**
 * Utilidad para reintentos con backoff exponencial
 * TODO: Implementar en tarea 3.1
 */

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelayMs: number = 1000,
): Promise<T> {
  // Placeholder - implementar lógica de reintentos
  return fn();
}
