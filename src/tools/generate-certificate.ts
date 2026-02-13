/**
 * Herramienta MCP: generateCertificate
 * Genera y envía certificados académicos
 * Integración con Lambda para generación de PDFs y envío
 */

import { GenerateCertificateInput, GenerateCertificateResult } from '../types/mcp-tools';
import {
  StudentHasDebtsError,
  InvalidCertificateTypeError,
  GenerationFailedError,
  DeliveryFailedError,
  InvalidStudentIdError,
} from '../types/errors';
import { retryWithBackoff } from '../utils/retry';
import { logger } from '../utils/logger';

const VALID_CERTIFICATE_TYPES = ['enrollment', 'grades', 'graduation'];

/**
 * Valida el tipo de certificado
 */
function validateCertificateType(certificateType: string): void {
  if (!VALID_CERTIFICATE_TYPES.includes(certificateType)) {
    throw new InvalidCertificateTypeError(certificateType);
  }
}

/**
 * Valida el studentId
 */
function validateStudentId(studentId: string): void {
  if (!studentId || studentId.trim().length === 0) {
    throw new InvalidStudentIdError(studentId);
  }
}

/**
 * Verifica si el estudiante tiene deudas pendientes
 * En producción, esto consultaría el sistema financiero
 */
async function checkStudentDebts(
  studentId: string,
): Promise<{ hasDebts: boolean; amount?: number }> {
  // Mock de verificación de deudas
  const studentsWithDebts: Record<string, number> = {
    STU003: 500,
    STU004: 1200,
  };

  return {
    hasDebts: studentId in studentsWithDebts,
    amount: studentsWithDebts[studentId],
  };
}

/**
 * Genera el certificado
 */
export async function generateCertificate(
  input: GenerateCertificateInput,
): Promise<GenerateCertificateResult> {
  const { studentId, certificateType, deliveryMethod, language = 'es' } = input;

  // Validar entrada
  validateStudentId(studentId);
  validateCertificateType(certificateType);

  logger.info(`Generando certificado ${certificateType} para estudiante: ${studentId}`);

  try {
    // Verificar deudas
    const debtStatus = await checkStudentDebts(studentId);
    if (debtStatus.hasDebts) {
      logger.warn(`Estudiante ${studentId} tiene deudas pendientes: $${debtStatus.amount}`);
      throw new StudentHasDebtsError(studentId, debtStatus.amount!);
    }

    // En producción, aquí se invocaría Lambda para generar el PDF
    // Por ahora usamos mock
    const result = await generateCertificateMock(input);

    logger.info(`Certificado generado exitosamente para: ${studentId}`);

    return result;
  } catch (error) {
    if (
      error instanceof StudentHasDebtsError ||
      error instanceof InvalidCertificateTypeError ||
      error instanceof InvalidStudentIdError
    ) {
      throw error;
    }

    logger.error(`Error al generar certificado para ${studentId}:`, error);
    throw new GenerationFailedError((error as Error).message);
  }
}

/**
 * Mock para desarrollo/testing
 * Simula generación y entrega de certificados
 */
export async function generateCertificateMock(
  input: GenerateCertificateInput,
): Promise<GenerateCertificateResult> {
  validateStudentId(input.studentId);
  validateCertificateType(input.certificateType);

  // Simular delay de generación
  await new Promise((resolve) => setTimeout(resolve, 200));

  const { studentId, certificateType, deliveryMethod, language = 'es' } = input;

  // Verificar deudas
  const debtStatus = await checkStudentDebts(studentId);
  if (debtStatus.hasDebts) {
    throw new StudentHasDebtsError(studentId, debtStatus.amount!);
  }

  // Simular generación exitosa
  const certificateId = `CERT-${Date.now()}-${studentId}`;
  const generatedAt = new Date().toISOString();

  const result: GenerateCertificateResult = {
    certificateId,
    status: 'generated',
    generatedAt,
  };

  // Simular entrega según método
  if (deliveryMethod === 'email') {
    // Simular envío por email
    result.status = 'sent';
    result.deliveryStatus = {
      method: 'email',
      destination: `${studentId}@universidad.edu`,
      sentAt: new Date().toISOString(),
    };
  } else if (deliveryMethod === 'download') {
    // Simular URL de descarga
    result.downloadUrl = `https://certificates.universidad.edu/download/${certificateId}.pdf`;
    result.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 horas
  }

  return result;
}

/**
 * Mock que simula fallo en generación
 */
export async function generateCertificateFailMock(
  input: GenerateCertificateInput,
): Promise<GenerateCertificateResult> {
  validateStudentId(input.studentId);
  validateCertificateType(input.certificateType);

  await new Promise((resolve) => setTimeout(resolve, 100));

  throw new GenerationFailedError('Error al generar PDF: servicio de plantillas no disponible');
}

/**
 * Mock que simula fallo en entrega
 */
export async function generateCertificateDeliveryFailMock(
  input: GenerateCertificateInput,
): Promise<GenerateCertificateResult> {
  validateStudentId(input.studentId);
  validateCertificateType(input.certificateType);

  await new Promise((resolve) => setTimeout(resolve, 100));

  const certificateId = `CERT-${Date.now()}-${input.studentId}`;

  // Certificado generado pero falla la entrega
  throw new DeliveryFailedError(
    'Servidor de correo no disponible',
    `${input.studentId}@universidad.edu`,
  );
}
