/**
 * Middleware de autenticación
 * Cumple con requisito 10.1: Autenticación antes de acceso a datos sensibles
 */

import { logger } from '../utils/logger';

/**
 * Resultado de autenticación
 */
export interface AuthenticationResult {
  authenticated: boolean;
  studentId?: string;
  sessionId: string;
  reason?: string;
}

/**
 * Contexto de autenticación
 */
export interface AuthenticationContext {
  sessionId: string;
  studentId?: string;
  contactId: string;
  channel: string;
  instanceARN: string;
  attributes: Record<string, string>;
}

/**
 * Middleware de autenticación
 */
export class AuthenticationMiddleware {
  /**
   * Verifica la autenticación antes de acceder a datos sensibles
   */
  static async authenticate(context: AuthenticationContext): Promise<AuthenticationResult> {
    logger.info('Verificando autenticación', {
      sessionId: context.sessionId,
      studentId: context.studentId,
      contactId: context.contactId,
    });

    // Verificar que el contexto tenga información básica
    if (!context.sessionId || !context.contactId) {
      logger.warn('Autenticación fallida: falta información de sesión', {
        sessionId: context.sessionId,
        contactId: context.contactId,
      });

      return {
        authenticated: false,
        sessionId: context.sessionId,
        reason: 'Información de sesión incompleta',
      };
    }

    // Verificar que la sesión sea válida (en producción, verificar con Amazon Connect)
    const sessionValid = await this.validateSession(context);

    if (!sessionValid) {
      logger.warn('Autenticación fallida: sesión inválida', {
        sessionId: context.sessionId,
        contactId: context.contactId,
      });

      return {
        authenticated: false,
        sessionId: context.sessionId,
        reason: 'Sesión inválida o expirada',
      };
    }

    // Verificar identidad del estudiante si se requiere acceso a datos sensibles
    if (context.studentId) {
      const identityVerified = await this.verifyStudentIdentity(context);

      if (!identityVerified) {
        logger.warn('Autenticación fallida: identidad no verificada', {
          sessionId: context.sessionId,
          studentId: context.studentId,
        });

        return {
          authenticated: false,
          sessionId: context.sessionId,
          reason: 'Identidad del estudiante no verificada',
        };
      }
    }

    logger.info('Autenticación exitosa', {
      sessionId: context.sessionId,
      studentId: context.studentId,
    });

    return {
      authenticated: true,
      studentId: context.studentId,
      sessionId: context.sessionId,
    };
  }

  /**
   * Valida que la sesión sea válida
   */
  private static async validateSession(context: AuthenticationContext): Promise<boolean> {
    // En producción, aquí se verificaría con Amazon Connect
    // que la sesión es válida y no ha expirado

    // Verificar que el instanceARN sea válido
    if (!context.instanceARN || !context.instanceARN.startsWith('arn:aws:connect:')) {
      return false;
    }

    // Verificar que el canal sea válido
    const validChannels = ['VOICE', 'CHAT', 'TASK'];
    if (!validChannels.includes(context.channel)) {
      return false;
    }

    // Simulación: todas las sesiones son válidas por ahora
    return true;
  }

  /**
   * Verifica la identidad del estudiante
   */
  private static async verifyStudentIdentity(context: AuthenticationContext): Promise<boolean> {
    // En producción, aquí se verificaría:
    // 1. Que el studentId en los atributos coincida con el autenticado
    // 2. Que el estudiante haya pasado por un proceso de verificación (PIN, etc.)
    // 3. Que no haya intentos de suplantación

    if (!context.studentId) {
      return false;
    }

    // Verificar que el studentId esté en los atributos de la sesión
    const studentIdInAttributes = context.attributes.studentId === context.studentId;

    if (!studentIdInAttributes) {
      logger.warn('StudentId no coincide con atributos de sesión', {
        contextStudentId: context.studentId,
        attributesStudentId: context.attributes.studentId,
      });
      return false;
    }

    // Simulación: todas las identidades son válidas si el studentId coincide
    return true;
  }

  /**
   * Verifica si se requiere autenticación para una operación
   */
  static requiresAuthentication(operation: string): boolean {
    // Operaciones que requieren autenticación
    const sensitiveOperations = [
      'getStudentProfile',
      'checkAcademicRecord',
      'generateCertificate',
      'updateStudentData',
      'accessFinancialData',
    ];

    return sensitiveOperations.includes(operation);
  }

  /**
   * Verifica permisos para acceder a datos de un estudiante
   */
  static async verifyAccess(
    authenticatedStudentId: string,
    requestedStudentId: string,
  ): Promise<boolean> {
    // Verificar que el estudiante autenticado solo acceda a sus propios datos
    if (authenticatedStudentId !== requestedStudentId) {
      logger.warn('Intento de acceso no autorizado', {
        authenticatedStudentId,
        requestedStudentId,
      });
      return false;
    }

    return true;
  }
}
