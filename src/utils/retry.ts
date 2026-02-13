/**
 * Utilidad para reintentos con backoff exponencial
 * Implementa estrategia de reintento con delay exponencial: 1s, 2s, 4s
 */

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelayMs: number = 1000,
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Si es el último intento, lanzar el error
      if (attempt === maxRetries) {
        throw lastError;
      }

      // Calcular delay con backoff exponencial
      const delayMs = initialDelayMs * Math.pow(2, attempt);

      // Esperar antes del siguiente intento
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError!;
}

/**
 * Delay helper para testing y uso general
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
