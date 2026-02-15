/**
 * Control de acceso y detección de intentos no autorizados
 * Cumple con requisito 10.5: Bloqueo de accesos no autorizados
 */

import { logger } from '../utils/logger';
import { AuditLogger } from './audit-logger';
import { AuthenticationMiddleware } from './authentication';

/**
 * Resultado de verificación de acceso
 */
export interface AccessCheckResult {
  allowed: boolean;
  reason?: string;
  blocked?: boolean;
  requiresEscalation?: boolean;
}

/**
 * Contador de intentos sospechosos por sesión
 */
const suspiciousAttempts = new Map<string, number>();

/**
 * Sesiones bloqueadas temporalmente
 */
const blockedSessions = new Map<string, number>();

/**
 * Control de acceso
 */
export class AccessControl {
  /**
   * Verifica si se permite el acceso a un recurso
   */
  static async checkAccess(params: {
    sessionId: string;
    authenticatedStudentId?: string;
    requestedStudentId: string;
    resourceType: string;
    operation: string;
  }): Promise<AccessCheckResult> {
    const { sessionId, authenticatedStudentId, requestedStudentId, resourceType, operation } =
      params;

    // Verificar si la sesión está bloqueada
    if (this.isSessionBlocked(sessionId)) {
      logger.warn('Acceso denegado: sesión bloqueada', {
        sessionId,
        resourceType,
      });

      return {
        allowed: false,
        blocked: true,
        reason: 'Sesión bloqueada por actividad sospechosa',
        requiresEscalation: true,
      };
    }

    // Verificar si la operación requiere autenticación
    if (AuthenticationMiddleware.requiresAuthentication(operation)) {
      if (!authenticatedStudentId) {
        logger.warn('Acceso denegado: no autenticado', {
          sessionId,
          operation,
        });

        return {
          allowed: false,
          reason: 'Autenticación requerida',
        };
      }

      // Verificar que el estudiante solo acceda a sus propios datos
      if (authenticatedStudentId !== requestedStudentId) {
        logger.warn('Intento de acceso no autorizado detectado', {
          sessionId,
          authenticatedStudentId,
          requestedStudentId,
          resourceType,
        });

        // Registrar intento no autorizado
        await AuditLogger.logUnauthorizedAccessAttempt(
          sessionId,
          authenticatedStudentId,
          requestedStudentId,
          resourceType,
        );

        // Incrementar contador de intentos sospechosos
        this.recordSuspiciousAttempt(sessionId);

        // Verificar si se debe bloquear la sesión
        if (this.shouldBlockSession(sessionId)) {
          this.blockSession(sessionId);

          return {
            allowed: false,
            blocked: true,
            reason: 'Sesión bloqueada por múltiples intentos no autorizados',
            requiresEscalation: true,
          };
        }

        return {
          allowed: false,
          reason: 'No autorizado para acceder a datos de otro estudiante',
        };
      }
    }

    // Acceso permitido
    return {
      allowed: true,
    };
  }

  /**
   * Verifica si una sesión está bloqueada
   */
  private static isSessionBlocked(sessionId: string): boolean {
    const blockTime = blockedSessions.get(sessionId);

    if (!blockTime) {
      return false;
    }

    // Verificar si el bloqueo ha expirado (15 minutos)
    const now = Date.now();
    const blockDuration = 15 * 60 * 1000; // 15 minutos

    if (now - blockTime > blockDuration) {
      // Bloqueo expirado, remover
      blockedSessions.delete(sessionId);
      suspiciousAttempts.delete(sessionId);
      return false;
    }

    return true;
  }

  /**
   * Registra un intento sospechoso
   */
  private static recordSuspiciousAttempt(sessionId: string): void {
    const currentAttempts = suspiciousAttempts.get(sessionId) || 0;
    suspiciousAttempts.set(sessionId, currentAttempts + 1);

    logger.warn('Intento sospechoso registrado', {
      sessionId,
      totalAttempts: currentAttempts + 1,
    });
  }

  /**
   * Determina si se debe bloquear una sesión
   */
  private static shouldBlockSession(sessionId: string): boolean {
    const attempts = suspiciousAttempts.get(sessionId) || 0;
    const threshold = 3; // Bloquear después de 3 intentos

    return attempts >= threshold;
  }

  /**
   * Bloquea una sesión temporalmente
   */
  private static blockSession(sessionId: string): void {
    blockedSessions.set(sessionId, Date.now());

    logger.error('Sesión bloqueada por actividad sospechosa', {
      sessionId,
      attempts: suspiciousAttempts.get(sessionId),
      blockDuration: '15 minutos',
    });
  }

  /**
   * Desbloquea una sesión manualmente
   */
  static unblockSession(sessionId: string): void {
    blockedSessions.delete(sessionId);
    suspiciousAttempts.delete(sessionId);

    logger.info('Sesión desbloqueada manualmente', { sessionId });
  }

  /**
   * Obtiene estadísticas de seguridad
   */
  static getSecurityStats(): {
    blockedSessions: number;
    suspiciousAttempts: number;
  } {
    return {
      blockedSessions: blockedSessions.size,
      suspiciousAttempts: suspiciousAttempts.size,
    };
  }

  /**
   * Limpia sesiones bloqueadas expiradas
   */
  static cleanupExpiredBlocks(): number {
    const now = Date.now();
    const blockDuration = 15 * 60 * 1000;
    let cleanedCount = 0;

    for (const [sessionId, blockTime] of blockedSessions.entries()) {
      if (now - blockTime > blockDuration) {
        blockedSessions.delete(sessionId);
        suspiciousAttempts.delete(sessionId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info('Bloqueos expirados limpiados', { count: cleanedCount });
    }

    return cleanedCount;
  }
}
