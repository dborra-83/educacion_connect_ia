/**
 * Orquestador de Generación de Certificados
 * Maneja el flujo completo: verificación de identidad, deudas, generación y entrega
 */

import { StudentProfile, GenerateCertificateInput, GenerateCertificateResult } from '../types/mcp-tools';
import { getStudentProfile, getStudentProfileMock } from '../tools/get-student-profile';
import { checkAcademicRecord, checkAcademicRecordMock } from '../tools/check-academic-record';
import { generateCertificate, generateCertificateMock } from '../tools/generate-certificate';
import { StudentHasDebtsError } from '../types/errors';
import { logger } from '../utils/logger';

/**
 * Resultado del proceso de generación de certificado
 */
export interface CertificateProcessResult {
  success: boolean;
  certificateResult?: GenerateCertificateResult;
  message: string;
  blockedReason?: string;
}

/**
 * Verifica la identidad del estudiante
 */
async function verifyStudentIdentity(
  studentId: string,
  useMock: boolean = true,
): Promise<StudentProfile> {
  logger.info(`Verificando identidad del estudiante: ${studentId}`);

  const getProfileFn = useMock ? getStudentProfileMock : getStudentProfile;

  const profile = await getProfileFn({
    studentId,
    includeAcademic: true,
    includeCRM: false,
  });

  logger.info(`Identidad verificada para: ${profile.firstName} ${profile.lastName}`);

  return profile;
}

/**
 * Verifica si el estudiante tiene deudas pendientes
 */
async function checkStudentDebts(
  studentId: string,
  useMock: boolean = true,
): Promise<{ hasDebts: boolean; debtAmount?: number }> {
  logger.info(`Verificando deudas del estudiante: ${studentId}`);

  const checkRecordFn = useMock ? checkAcademicRecordMock : checkAcademicRecord;

  try {
    const record = await checkRecordFn({
      studentId,
      includeCourses: false,
      includeGrades: false,
    });

    // Verificar si hay deudas en el estado financiero
    // En el mock, esto viene en alerts o podríamos tener un campo específico
    const hasDebts = record.alerts?.some((alert) =>
      alert.message.toLowerCase().includes('deuda'),
    );

    if (hasDebts) {
      // Intentar extraer monto de la deuda
      const debtAlert = record.alerts?.find((alert) =>
        alert.message.toLowerCase().includes('deuda'),
      );
      logger.warn(`Estudiante ${studentId} tiene deudas pendientes`);

      return {
        hasDebts: true,
        debtAmount: 0, // En producción, esto vendría del sistema financiero
      };
    }

    logger.info(`Estudiante ${studentId} no tiene deudas pendientes`);

    return {
      hasDebts: false,
    };
  } catch (error) {
    logger.error(`Error al verificar deudas de ${studentId}:`, error);
    // En caso de error, asumir que no hay deudas para no bloquear innecesariamente
    return {
      hasDebts: false,
    };
  }
}

/**
 * Orquesta el proceso completo de generación de certificado
 * Implementa el flujo: verificar identidad → verificar deudas → generar → entregar
 */
export async function orchestrateCertificateGeneration(
  input: GenerateCertificateInput,
  useMock: boolean = true,
): Promise<CertificateProcessResult> {
  const { studentId, certificateType, deliveryMethod, language = 'es' } = input;

  logger.info(
    `Iniciando proceso de generación de certificado ${certificateType} para: ${studentId}`,
  );

  try {
    // Paso 1: Verificar identidad del estudiante
    const profile = await verifyStudentIdentity(studentId, useMock);

    // Paso 2: Verificar deudas pendientes
    const debtStatus = await checkStudentDebts(studentId, useMock);

    if (debtStatus.hasDebts) {
      logger.warn(`Generación bloqueada por deudas para: ${studentId}`);

      return {
        success: false,
        message: `Lo siento, ${profile.firstName}. Para generar tu certificado, necesitas estar al día con tus pagos. ${debtStatus.debtAmount ? `Tienes un saldo pendiente de $${debtStatus.debtAmount}.` : ''} Por favor, acércate a la oficina de tesorería o realiza el pago en línea.`,
        blockedReason: 'debts',
      };
    }

    // Paso 3: Generar el certificado
    const generateFn = useMock ? generateCertificateMock : generateCertificate;

    const certificateResult = await generateFn({
      studentId,
      certificateType,
      deliveryMethod,
      language,
    });

    // Paso 4: Confirmar entrega
    let confirmationMessage = `¡Perfecto, ${profile.firstName}! `;

    if (certificateResult.status === 'sent' && certificateResult.deliveryStatus) {
      confirmationMessage += `Tu certificado de ${getCertificateTypeName(certificateType)} ha sido generado y enviado a ${certificateResult.deliveryStatus.destination}. `;
      confirmationMessage += `Deberías recibirlo en los próximos minutos. `;
    } else if (certificateResult.downloadUrl) {
      confirmationMessage += `Tu certificado de ${getCertificateTypeName(certificateType)} ha sido generado. `;
      confirmationMessage += `Puedes descargarlo desde el siguiente enlace (válido por 24 horas): ${certificateResult.downloadUrl}`;
    } else {
      confirmationMessage += `Tu certificado de ${getCertificateTypeName(certificateType)} ha sido generado exitosamente. `;
    }

    confirmationMessage += `\n\nNúmero de certificado: ${certificateResult.certificateId}`;

    logger.info(`Certificado generado exitosamente para: ${studentId}`);

    return {
      success: true,
      certificateResult,
      message: confirmationMessage,
    };
  } catch (error) {
    logger.error(`Error en proceso de generación de certificado para ${studentId}:`, error);

    // Manejar error de deudas específicamente
    if (error instanceof StudentHasDebtsError) {
      return {
        success: false,
        message: `Lo siento, para generar tu certificado necesitas estar al día con tus pagos. Tienes un saldo pendiente de $${error.metadata?.debtAmount || 0}. Por favor, acércate a la oficina de tesorería.`,
        blockedReason: 'debts',
      };
    }

    // Error genérico
    return {
      success: false,
      message:
        'Lo siento, tuve un problema al generar tu certificado. Por favor, intenta de nuevo más tarde o contacta con la oficina de registro.',
      blockedReason: 'system_error',
    };
  }
}

/**
 * Obtiene el nombre legible del tipo de certificado
 */
function getCertificateTypeName(certificateType: string): string {
  const names: Record<string, string> = {
    enrollment: 'inscripción',
    grades: 'calificaciones',
    graduation: 'graduación',
  };

  return names[certificateType] || certificateType;
}

/**
 * Genera mensaje de inicio del proceso
 */
export function generateCertificateRequestMessage(
  profile: StudentProfile,
  certificateType: string,
): string {
  const typeName = getCertificateTypeName(certificateType);

  return `Perfecto, ${profile.firstName}. Voy a generar tu certificado de ${typeName}. Déjame verificar que todo esté en orden...`;
}

/**
 * Valida que el tipo de certificado sea válido
 */
export function validateCertificateRequest(certificateType: string): {
  valid: boolean;
  message?: string;
} {
  const validTypes = ['enrollment', 'grades', 'graduation'];

  if (!validTypes.includes(certificateType)) {
    return {
      valid: false,
      message: `El tipo de certificado "${certificateType}" no es válido. Los tipos disponibles son: inscripción, calificaciones y graduación.`,
    };
  }

  return {
    valid: true,
  };
}
