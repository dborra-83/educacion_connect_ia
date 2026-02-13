/**
 * Jerarquía de errores personalizados del sistema
 */

// ============================================================================
// Error Base
// ============================================================================

export class MCPError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public metadata?: Record<string, any>,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

// ============================================================================
// Errores de getStudentProfile
// ============================================================================

export class StudentNotFoundError extends MCPError {
  constructor(studentId: string) {
    super(
      `Estudiante con ID ${studentId} no encontrado`,
      'STUDENT_NOT_FOUND',
      404,
      { studentId },
    );
  }
}

export class InvalidStudentIdError extends MCPError {
  constructor(studentId: string) {
    super(
      `ID de estudiante inválido: ${studentId}`,
      'INVALID_STUDENT_ID',
      400,
      { studentId },
    );
  }
}

// ============================================================================
// Errores de queryKnowledgeBase
// ============================================================================

export class EmptyQueryError extends MCPError {
  constructor() {
    super('La consulta no puede estar vacía', 'EMPTY_QUERY', 400);
  }
}

export class NoResultsFoundError extends MCPError {
  constructor(query: string) {
    super(
      `No se encontraron resultados para: ${query}`,
      'NO_RESULTS_FOUND',
      404,
      { query },
    );
  }
}

// ============================================================================
// Errores de generateCertificate
// ============================================================================

export class StudentHasDebtsError extends MCPError {
  constructor(studentId: string, debtAmount: number) {
    super(
      `El estudiante ${studentId} tiene deudas pendientes de $${debtAmount}`,
      'STUDENT_HAS_DEBTS',
      403,
      { studentId, debtAmount },
    );
  }
}

export class InvalidCertificateTypeError extends MCPError {
  constructor(certificateType: string) {
    super(
      `Tipo de certificado inválido: ${certificateType}`,
      'INVALID_CERTIFICATE_TYPE',
      400,
      { certificateType },
    );
  }
}

export class GenerationFailedError extends MCPError {
  constructor(reason: string) {
    super(`Error al generar el certificado: ${reason}`, 'GENERATION_FAILED', 500, { reason });
  }
}

export class DeliveryFailedError extends MCPError {
  constructor(reason: string, destination: string) {
    super(
      `Error al entregar el certificado a ${destination}: ${reason}`,
      'DELIVERY_FAILED',
      500,
      { reason, destination },
    );
  }
}

// ============================================================================
// Errores de Servicios
// ============================================================================

export class ServiceUnavailableError extends MCPError {
  constructor(serviceName: string) {
    super(
      `El servicio ${serviceName} no está disponible temporalmente`,
      'SERVICE_UNAVAILABLE',
      503,
      { serviceName },
    );
  }
}

export class TimeoutError extends MCPError {
  constructor(operation: string, timeoutMs: number) {
    super(
      `La operación ${operation} excedió el tiempo límite de ${timeoutMs}ms`,
      'TIMEOUT',
      504,
      { operation, timeoutMs },
    );
  }
}

// ============================================================================
// Errores de Autenticación y Autorización
// ============================================================================

export class UnauthorizedAccessError extends MCPError {
  constructor(resource: string) {
    super(`Acceso no autorizado al recurso: ${resource}`, 'UNAUTHORIZED_ACCESS', 401, {
      resource,
    });
  }
}

export class ForbiddenAccessError extends MCPError {
  constructor(resource: string, reason: string) {
    super(`Acceso prohibido a ${resource}: ${reason}`, 'FORBIDDEN_ACCESS', 403, {
      resource,
      reason,
    });
  }
}

// ============================================================================
// Tipos de Respuesta de Error
// ============================================================================

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    statusCode: number;
    metadata?: Record<string, any>;
    timestamp: string;
  };
}

export interface ErrorMetadata {
  timestamp: string;
  requestId?: string;
  studentId?: string;
  operation?: string;
  stackTrace?: string;
}

// ============================================================================
// Helper para crear ErrorResponse
// ============================================================================

export function createErrorResponse(error: MCPError, requestId?: string): ErrorResponse {
  return {
    error: {
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
      metadata: {
        ...error.metadata,
        requestId,
      },
      timestamp: new Date().toISOString(),
    },
  };
}
