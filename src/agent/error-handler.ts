/**
 * Capa de Manejo de Errores
 * Traduce errores técnicos a mensajes amigables y genera alternativas
 */

import {
  MCPError,
  StudentNotFoundError,
  InvalidStudentIdError,
  EmptyQueryError,
  NoResultsFoundError,
  StudentHasDebtsError,
  InvalidCertificateTypeError,
  GenerationFailedError,
  DeliveryFailedError,
  ServiceUnavailableError,
  TimeoutError,
  UnauthorizedAccessError,
  ForbiddenAccessError,
} from '../types/errors';
import { logger } from '../utils/logger';

/**
 * Severidad del error
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Resultado del manejo de error
 */
export interface ErrorHandlingResult {
  userMessage: string;
  alternatives: string[];
  requiresHumanEscalation: boolean;
  severity: ErrorSeverity;
  canRetry: boolean;
}

/**
 * Diccionario de mensajes de error amigables
 */
const ERROR_MESSAGES: Record<string, string> = {
  // Errores de estudiante
  STUDENT_NOT_FOUND:
    'No pude encontrar tu información en el sistema. Por favor, verifica tu número de identificación.',
  INVALID_STUDENT_ID:
    'El número de identificación que proporcionaste no tiene el formato correcto. Por favor, verifica e intenta de nuevo.',

  // Errores de consulta
  EMPTY_QUERY: 'Por favor, proporciona más detalles sobre lo que necesitas saber.',
  NO_RESULTS_FOUND: 'No encontré información sobre tu consulta en nuestra base de conocimiento.',

  // Errores de certificados
  STUDENT_HAS_DEBTS:
    'No puedo generar tu certificado porque tienes pagos pendientes. Por favor, regulariza tu situación financiera.',
  INVALID_CERTIFICATE_TYPE:
    'El tipo de certificado que solicitaste no está disponible. Por favor, especifica si necesitas un certificado de inscripción, calificaciones o graduación.',
  GENERATION_FAILED:
    'Tuve un problema al generar tu certificado. Por favor, intenta de nuevo en unos minutos.',
  DELIVERY_FAILED:
    'Tu certificado fue generado pero tuve problemas al enviarlo. Por favor, verifica tu correo electrónico o solicita el envío nuevamente.',

  // Errores de servicio
  SERVICE_UNAVAILABLE:
    'Estoy teniendo dificultades para acceder a algunos servicios en este momento. Por favor, intenta de nuevo en unos minutos.',
  TIMEOUT: 'La operación está tomando más tiempo del esperado. Por favor, intenta de nuevo.',

  // Errores de autenticación
  UNAUTHORIZED_ACCESS:
    'Necesito verificar tu identidad antes de continuar. Por favor, proporciona tu número de identificación de estudiante.',
  FORBIDDEN_ACCESS:
    'No tienes los permisos necesarios para realizar esta acción. Si crees que esto es un error, contacta con soporte.',

  // Error genérico
  UNKNOWN_ERROR:
    'Ocurrió un problema inesperado. Por favor, intenta de nuevo o contacta con soporte si el problema persiste.',
};

/**
 * Traductor de errores técnicos a mensajes amigables
 */
export class ErrorTranslator {
  /**
   * Traduce un error técnico a un mensaje amigable para el usuario
   */
  static translateError(error: Error | MCPError): string {
    // Si es un MCPError, usar el código para buscar el mensaje
    if (error instanceof MCPError) {
      const friendlyMessage = ERROR_MESSAGES[error.code];

      if (friendlyMessage) {
        return friendlyMessage;
      }
    }

    // Si no hay mensaje específico, usar mensaje genérico
    return ERROR_MESSAGES.UNKNOWN_ERROR;
  }

  /**
   * Filtra información técnica del mensaje de error
   */
  static sanitizeErrorMessage(message: string): string {
    // Remover stack traces
    let sanitized = message.split('\n')[0];

    // Remover códigos de error internos
    sanitized = sanitized.replace(/\b[A-Z_]+_ERROR\b/g, '');

    // Remover nombres de servicios técnicos
    sanitized = sanitized.replace(/\b(DynamoDB|Lambda|Kendra|S3)\b/gi, 'servicio');

    // Remover IDs técnicos
    sanitized = sanitized.replace(
      /\b[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\b/gi,
      '[ID]',
    );

    return sanitized.trim();
  }
}

/**
 * Generador de alternativas ante fallos
 */
export class AlternativeGenerator {
  /**
   * Genera alternativas según el tipo de error
   */
  static generateAlternatives(error: Error | MCPError): string[] {
    const alternatives: string[] = [];

    if (error instanceof StudentNotFoundError || error instanceof InvalidStudentIdError) {
      alternatives.push('Verifica tu número de identificación y vuelve a intentar');
      alternatives.push('Contacta con la oficina de registro al (555) 123-4567');
      alternatives.push('Envía un correo a registro@universidad.edu');
    } else if (error instanceof EmptyQueryError) {
      alternatives.push('Reformula tu pregunta con más detalles');
      alternatives.push('Consulta nuestras preguntas frecuentes en el portal web');
    } else if (error instanceof NoResultsFoundError) {
      alternatives.push('Intenta reformular tu pregunta de otra manera');
      alternatives.push('Contacta con la oficina de admisiones para más información');
      alternatives.push('Visita nuestro portal web en www.universidad.edu');
    } else if (error instanceof StudentHasDebtsError) {
      alternatives.push('Realiza el pago en línea en el portal de pagos');
      alternatives.push('Acércate a la oficina de tesorería');
      alternatives.push('Solicita un plan de pagos llamando al (555) 123-4568');
    } else if (error instanceof GenerationFailedError || error instanceof DeliveryFailedError) {
      alternatives.push('Intenta solicitar el certificado nuevamente en unos minutos');
      alternatives.push('Contacta con soporte técnico si el problema persiste');
    } else if (error instanceof ServiceUnavailableError || error instanceof TimeoutError) {
      alternatives.push('Intenta de nuevo en 5-10 minutos');
      alternatives.push('Si es urgente, puedo transferirte con un asesor humano');
    } else if (error instanceof UnauthorizedAccessError) {
      alternatives.push('Proporciona tu número de identificación de estudiante');
      alternatives.push('Verifica que estés usando las credenciales correctas');
    } else if (error instanceof ForbiddenAccessError) {
      alternatives.push('Contacta con soporte para verificar tus permisos');
      alternatives.push('Puedo transferirte con un asesor que te ayudará');
    } else {
      // Alternativas genéricas
      alternatives.push('Intenta de nuevo en unos minutos');
      alternatives.push('Puedo transferirte con un asesor humano para ayudarte mejor');
    }

    return alternatives;
  }

  /**
   * Genera sugerencia de contacto humano
   */
  static generateHumanContactSuggestion(error: Error | MCPError): string {
    if (
      error instanceof ServiceUnavailableError ||
      error instanceof TimeoutError ||
      error instanceof GenerationFailedError
    ) {
      return 'Si el problema persiste, puedo transferirte con un asesor que te ayudará directamente.';
    }

    if (error instanceof ForbiddenAccessError || error instanceof UnauthorizedAccessError) {
      return 'Puedo transferirte con un asesor que verificará tu situación y te ayudará.';
    }

    return 'Si necesitas ayuda adicional, puedo transferirte con un asesor humano.';
  }

  /**
   * Genera sugerencia de reintento
   */
  static generateRetrySuggestion(error: Error | MCPError): string | null {
    if (error instanceof ServiceUnavailableError || error instanceof TimeoutError) {
      return 'Por favor, intenta de nuevo en unos minutos cuando el servicio esté disponible.';
    }

    if (error instanceof GenerationFailedError || error instanceof DeliveryFailedError) {
      return 'Puedes intentar solicitar el certificado nuevamente ahora.';
    }

    if (error instanceof InvalidStudentIdError) {
      return 'Por favor, verifica tu número de identificación e intenta de nuevo.';
    }

    // No sugerir reintento para errores que no se resolverán con reintentos
    if (
      error instanceof StudentHasDebtsError ||
      error instanceof ForbiddenAccessError ||
      error instanceof StudentNotFoundError
    ) {
      return null;
    }

    return 'Puedes intentar de nuevo.';
  }
}

/**
 * Clasificador de severidad de errores
 */
export class ErrorSeverityClassifier {
  /**
   * Clasifica la severidad de un error
   */
  static classify(error: Error | MCPError): ErrorSeverity {
    // Errores críticos - requieren escalamiento inmediato
    if (error instanceof UnauthorizedAccessError || error instanceof ForbiddenAccessError) {
      return ErrorSeverity.CRITICAL;
    }

    // Errores de alta severidad - afectan funcionalidad principal
    if (
      error instanceof ServiceUnavailableError ||
      error instanceof TimeoutError ||
      error instanceof GenerationFailedError
    ) {
      return ErrorSeverity.HIGH;
    }

    // Errores de severidad media - afectan experiencia pero tienen alternativas
    if (
      error instanceof StudentHasDebtsError ||
      error instanceof DeliveryFailedError ||
      error instanceof NoResultsFoundError
    ) {
      return ErrorSeverity.MEDIUM;
    }

    // Errores de baja severidad - fácilmente recuperables
    if (
      error instanceof InvalidStudentIdError ||
      error instanceof EmptyQueryError ||
      error instanceof InvalidCertificateTypeError ||
      error instanceof StudentNotFoundError
    ) {
      return ErrorSeverity.LOW;
    }

    // Por defecto, severidad media
    return ErrorSeverity.MEDIUM;
  }

  /**
   * Determina si un error requiere escalamiento a humano
   */
  static requiresEscalation(error: Error | MCPError): boolean {
    const severity = this.classify(error);

    // Escalar errores críticos siempre
    if (severity === ErrorSeverity.CRITICAL) {
      return true;
    }

    // Escalar errores de alta severidad que no se pueden resolver automáticamente
    if (severity === ErrorSeverity.HIGH) {
      if (error instanceof ServiceUnavailableError || error instanceof GenerationFailedError) {
        return true;
      }
    }

    return false;
  }

  /**
   * Determina si se puede reintentar la operación
   */
  static canRetry(error: Error | MCPError): boolean {
    // Errores que se pueden reintentar
    if (
      error instanceof ServiceUnavailableError ||
      error instanceof TimeoutError ||
      error instanceof GenerationFailedError ||
      error instanceof DeliveryFailedError ||
      error instanceof InvalidStudentIdError
    ) {
      return true;
    }

    // Errores que NO se pueden reintentar (requieren acción del usuario)
    if (
      error instanceof StudentHasDebtsError ||
      error instanceof ForbiddenAccessError ||
      error instanceof StudentNotFoundError ||
      error instanceof UnauthorizedAccessError
    ) {
      return false;
    }

    // Por defecto, permitir reintento
    return true;
  }
}

/**
 * Manejador principal de errores
 */
export class ErrorHandler {
  /**
   * Maneja un error y genera respuesta completa para el usuario
   */
  static handleError(error: Error | MCPError, context?: Record<string, any>): ErrorHandlingResult {
    // Registrar el error
    this.logError(error, context);

    // Traducir a mensaje amigable
    const userMessage = ErrorTranslator.translateError(error);

    // Generar alternativas
    const alternatives = AlternativeGenerator.generateAlternatives(error);

    // Clasificar severidad
    const severity = ErrorSeverityClassifier.classify(error);

    // Determinar si requiere escalamiento
    const requiresHumanEscalation = ErrorSeverityClassifier.requiresEscalation(error);

    // Determinar si se puede reintentar
    const canRetry = ErrorSeverityClassifier.canRetry(error);

    return {
      userMessage,
      alternatives,
      requiresHumanEscalation,
      severity,
      canRetry,
    };
  }

  /**
   * Registra el error en los logs
   */
  private static logError(error: Error | MCPError, context?: Record<string, any>): void {
    const errorInfo: Record<string, any> = {
      name: error.name,
      message: error.message,
      timestamp: new Date().toISOString(),
    };

    if (error instanceof MCPError) {
      errorInfo.code = error.code;
      errorInfo.statusCode = error.statusCode;
      errorInfo.metadata = error.metadata;
    }

    if (error.stack) {
      errorInfo.stack = error.stack;
    }

    if (context) {
      errorInfo.context = context;
    }

    logger.error('Error manejado:', errorInfo);
  }

  /**
   * Genera mensaje completo para el usuario incluyendo alternativas
   */
  static generateUserMessage(result: ErrorHandlingResult): string {
    let message = result.userMessage;

    // Agregar alternativas si existen
    if (result.alternatives.length > 0) {
      message += '\n\nPuedes:';
      result.alternatives.forEach((alt, index) => {
        message += `\n${index + 1}. ${alt}`;
      });
    }

    return message;
  }
}
