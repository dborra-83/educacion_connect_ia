/**
 * Automatización de Trámites Administrativos
 * Clasifica, valida y ejecuta trámites administrativos de manera automatizada
 */

import { AcademicRecord } from '../types/mcp-tools';
import { checkAcademicRecordMock } from '../tools/check-academic-record';
import { generateCertificateMock } from '../tools/generate-certificate';
import { logger } from '../utils/logger';

/**
 * Tipos de trámite soportados
 */
export enum ProcedureType {
  CERTIFICATE_REQUEST = 'certificate_request',
  ENROLLMENT = 'enrollment',
  COURSE_REGISTRATION = 'course_registration',
  GRADE_APPEAL = 'grade_appeal',
  PROGRAM_CHANGE = 'program_change',
  WITHDRAWAL = 'withdrawal',
  UNKNOWN = 'unknown',
}

/**
 * Resultado de clasificación de trámite
 */
export interface ProcedureClassification {
  type: ProcedureType;
  confidence: number;
  parameters: Record<string, any>;
}

/**
 * Resultado de validación de requisitos
 */
export interface ValidationResult {
  isValid: boolean;
  missingRequirements: string[];
  impediments: string[];
  warnings: string[];
}

/**
 * Paso de ejecución de trámite
 */
export interface ProcedureStep {
  stepNumber: number;
  name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  result?: any;
  error?: string;
}

/**
 * Resultado de ejecución de trámite
 */
export interface ProcedureExecutionResult {
  success: boolean;
  procedureType: ProcedureType;
  steps: ProcedureStep[];
  finalMessage: string;
  trackingId?: string;
}

/**
 * Clasificador de tipos de trámite
 */
export class ProcedureClassifier {
  /**
   * Identifica el tipo de trámite desde el mensaje del usuario
   */
  static classify(userMessage: string): ProcedureClassification {
    const messageLower = userMessage.toLowerCase();

    // Detectar solicitud de certificado
    if (
      messageLower.match(/\b(certificado|constancia|documento|certificación|comprobante)\b/) &&
      (messageLower.includes('necesito') ||
        messageLower.includes('solicitar') ||
        messageLower.includes('quiero') ||
        messageLower.includes('generar'))
    ) {
      let certificateType = 'enrollment';

      if (messageLower.includes('calificacion') || messageLower.includes('notas')) {
        certificateType = 'grades';
      } else if (
        messageLower.includes('graduacion') ||
        messageLower.includes('graduado') ||
        messageLower.includes('graduación')
      ) {
        certificateType = 'graduation';
      }

      return {
        type: ProcedureType.CERTIFICATE_REQUEST,
        confidence: 0.9,
        parameters: { certificateType },
      };
    }

    // Detectar inscripción
    if (
      messageLower.match(/\b(inscripción|inscribir|inscribirme|matricula|matricular)\b/) &&
      (messageLower.includes('quiero') ||
        messageLower.includes('necesito') ||
        messageLower.includes('cómo') ||
        messageLower.includes('programa'))
    ) {
      return {
        type: ProcedureType.ENROLLMENT,
        confidence: 0.85,
        parameters: {},
      };
    }

    // Detectar registro de materias
    if (
      messageLower.match(/\b(registrar|inscribir|agregar|añadir)\b/) &&
      messageLower.match(/\b(materia|curso|asignatura|clase)\b/)
    ) {
      return {
        type: ProcedureType.COURSE_REGISTRATION,
        confidence: 0.85,
        parameters: {},
      };
    }

    // Detectar apelación de calificación
    if (
      messageLower.match(/\b(apelar|reclamar|revisar|impugnar)\b/) &&
      messageLower.match(/\b(calificación|nota|evaluación)\b/)
    ) {
      return {
        type: ProcedureType.GRADE_APPEAL,
        confidence: 0.8,
        parameters: {},
      };
    }

    // Detectar cambio de programa
    if (
      messageLower.match(/\b(cambiar|cambio|transferir)\b/) &&
      messageLower.match(/\b(programa|carrera)\b/)
    ) {
      return {
        type: ProcedureType.PROGRAM_CHANGE,
        confidence: 0.8,
        parameters: {},
      };
    }

    // Detectar retiro
    if (
      messageLower.match(/\b(retirar|retiro|dar de baja|cancelar)\b/) &&
      (messageLower.includes('materia') ||
        messageLower.includes('curso') ||
        messageLower.includes('semestre'))
    ) {
      return {
        type: ProcedureType.WITHDRAWAL,
        confidence: 0.8,
        parameters: {},
      };
    }

    // Tipo desconocido
    return {
      type: ProcedureType.UNKNOWN,
      confidence: 0.5,
      parameters: {},
    };
  }
}

/**
 * Validador de requisitos de trámite
 */
export class ProcedureValidator {
  /**
   * Valida que el estudiante cumple los requisitos para un trámite
   */
  static async validate(
    procedureType: ProcedureType,
    studentId: string,
    parameters: Record<string, any>,
    useMock: boolean = true,
  ): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      missingRequirements: [],
      impediments: [],
      warnings: [],
    };

    try {
      // Obtener historial académico del estudiante
      const academicRecord = await checkAcademicRecordMock({
        studentId,
        includeCourses: true,
        includeGrades: true,
      });

      // Validar según tipo de trámite
      switch (procedureType) {
        case ProcedureType.CERTIFICATE_REQUEST:
          this.validateCertificateRequest(academicRecord, result);
          break;

        case ProcedureType.ENROLLMENT:
          this.validateEnrollment(academicRecord, result);
          break;

        case ProcedureType.COURSE_REGISTRATION:
          this.validateCourseRegistration(academicRecord, result);
          break;

        case ProcedureType.GRADE_APPEAL:
          this.validateGradeAppeal(academicRecord, result);
          break;

        case ProcedureType.PROGRAM_CHANGE:
          this.validateProgramChange(academicRecord, result);
          break;

        case ProcedureType.WITHDRAWAL:
          this.validateWithdrawal(academicRecord, result);
          break;

        default:
          result.isValid = false;
          result.missingRequirements.push('Tipo de trámite no reconocido');
      }

      logger.info(
        `Validación de trámite ${procedureType} para estudiante ${studentId}: ${result.isValid ? 'VÁLIDO' : 'INVÁLIDO'}`,
      );
    } catch (error) {
      logger.error('Error al validar requisitos de trámite:', error);
      result.isValid = false;
      result.impediments.push('No se pudo verificar tu información académica');
    }

    return result;
  }

  /**
   * Valida requisitos para solicitud de certificado
   */
  private static validateCertificateRequest(
    academicRecord: AcademicRecord,
    result: ValidationResult,
  ): void {
    // Verificar deudas pendientes
    if (academicRecord.alerts) {
      const debtAlerts = academicRecord.alerts.filter((alert) =>
        alert.message.toLowerCase().includes('deuda'),
      );

      if (debtAlerts.length > 0) {
        result.isValid = false;
        result.impediments.push('Tienes deudas pendientes que deben ser saldadas');
      }
    }

    // Verificar estado académico
    if (academicRecord.academicStanding === 'probation') {
      result.warnings.push('Estás en período de prueba académica');
    }
  }

  /**
   * Valida requisitos para inscripción
   */
  private static validateEnrollment(
    academicRecord: AcademicRecord,
    result: ValidationResult,
  ): void {
    // Verificar que no esté ya inscrito
    if (academicRecord.courses) {
      const activeCourses = academicRecord.courses.filter((c) => c.status === 'in_progress');

      if (activeCourses.length > 0) {
        result.isValid = false;
        result.impediments.push('Ya tienes materias activas en el semestre actual');
      }
    }

    // Verificar estado académico
    if (academicRecord.academicStanding === 'probation') {
      result.warnings.push(
        'Estás en período de prueba académica. Consulta con tu asesor antes de inscribirte',
      );
    }
  }

  /**
   * Valida requisitos para registro de materias
   */
  private static validateCourseRegistration(
    academicRecord: AcademicRecord,
    result: ValidationResult,
  ): void {
    // Verificar créditos disponibles
    const maxCreditsPerSemester = 18;
    const currentCredits = academicRecord.courses
      ? academicRecord.courses
          .filter((c) => c.status === 'in_progress')
          .reduce((sum, c) => sum + c.credits, 0)
      : 0;

    if (currentCredits >= maxCreditsPerSemester) {
      result.isValid = false;
      result.impediments.push(
        `Has alcanzado el límite de créditos por semestre (${maxCreditsPerSemester})`,
      );
    }

    // Verificar estado académico
    if (academicRecord.academicStanding === 'probation') {
      result.warnings.push('Estás en período de prueba. Límite reducido de créditos');
    }
  }

  /**
   * Valida requisitos para apelación de calificación
   */
  private static validateGradeAppeal(
    academicRecord: AcademicRecord,
    result: ValidationResult,
  ): void {
    // Verificar que tenga materias completadas
    if (!academicRecord.courses || academicRecord.courses.length === 0) {
      result.isValid = false;
      result.missingRequirements.push('No tienes materias completadas para apelar');
    }

    // Verificar plazo (simulado - en producción verificar fecha real)
    result.warnings.push('Verifica que estés dentro del plazo de apelación (15 días)');
  }

  /**
   * Valida requisitos para cambio de programa
   */
  private static validateProgramChange(
    academicRecord: AcademicRecord,
    result: ValidationResult,
  ): void {
    // Verificar GPA mínimo
    const minGPA = 2.5;

    if (academicRecord.gpa < minGPA) {
      result.isValid = false;
      result.impediments.push(
        `Necesitas un GPA mínimo de ${minGPA} para cambiar de programa (actual: ${academicRecord.gpa})`,
      );
    }

    // Verificar créditos completados
    const minCredits = 12;

    if (academicRecord.completedCredits < minCredits) {
      result.isValid = false;
      result.impediments.push(
        `Necesitas al menos ${minCredits} créditos completados (actual: ${academicRecord.completedCredits})`,
      );
    }
  }

  /**
   * Valida requisitos para retiro
   */
  private static validateWithdrawal(
    academicRecord: AcademicRecord,
    result: ValidationResult,
  ): void {
    // Verificar que tenga materias activas
    if (academicRecord.courses) {
      const activeCourses = academicRecord.courses.filter((c) => c.status === 'in_progress');

      if (activeCourses.length === 0) {
        result.isValid = false;
        result.missingRequirements.push('No tienes materias activas para retirar');
      }
    }

    // Advertir sobre impacto en progreso
    result.warnings.push('El retiro puede afectar tu progreso académico y ayuda financiera');
  }
}

/**
 * Ejecutor de trámites multi-paso
 */
export class ProcedureExecutor {
  /**
   * Ejecuta un trámite completo con todos sus pasos
   */
  static async execute(
    procedureType: ProcedureType,
    studentId: string,
    parameters: Record<string, any>,
    useMock: boolean = true,
  ): Promise<ProcedureExecutionResult> {
    const result: ProcedureExecutionResult = {
      success: false,
      procedureType,
      steps: [],
      finalMessage: '',
    };

    try {
      logger.info(`Iniciando ejecución de trámite ${procedureType} para estudiante ${studentId}`);

      // Ejecutar según tipo de trámite
      switch (procedureType) {
        case ProcedureType.CERTIFICATE_REQUEST:
          await this.executeCertificateRequest(studentId, parameters, result, useMock);
          break;

        case ProcedureType.ENROLLMENT:
          await this.executeEnrollment(studentId, parameters, result, useMock);
          break;

        case ProcedureType.COURSE_REGISTRATION:
          await this.executeCourseRegistration(studentId, parameters, result, useMock);
          break;

        case ProcedureType.GRADE_APPEAL:
          await this.executeGradeAppeal(studentId, parameters, result, useMock);
          break;

        case ProcedureType.PROGRAM_CHANGE:
          await this.executeProgramChange(studentId, parameters, result, useMock);
          break;

        case ProcedureType.WITHDRAWAL:
          await this.executeWithdrawal(studentId, parameters, result, useMock);
          break;

        default:
          result.finalMessage = 'Tipo de trámite no soportado';
          return result;
      }

      // Verificar si todos los pasos se completaron
      result.success =
        result.steps.length > 0 && result.steps.every((step) => step.status === 'completed');

      logger.info(
        `Trámite ${procedureType} ${result.success ? 'completado' : 'falló'} para estudiante ${studentId}`,
      );
    } catch (error) {
      logger.error('Error al ejecutar trámite:', error);
      result.finalMessage =
        'Ocurrió un error al procesar tu trámite. Por favor, intenta más tarde o contacta con soporte.';
    }

    return result;
  }

  /**
   * Ejecuta solicitud de certificado
   */
  private static async executeCertificateRequest(
    studentId: string,
    parameters: Record<string, any>,
    result: ProcedureExecutionResult,
    useMock: boolean,
  ): Promise<void> {
    // Paso 1: Verificar identidad
    const step1: ProcedureStep = {
      stepNumber: 1,
      name: 'Verificación de identidad',
      status: 'in_progress',
    };
    result.steps.push(step1);

    try {
      // Simulación de verificación
      await new Promise((resolve) => setTimeout(resolve, 100));
      step1.status = 'completed';
      step1.result = { verified: true };
    } catch (error) {
      step1.status = 'failed';
      step1.error = 'No se pudo verificar tu identidad';
      result.finalMessage = 'No pudimos verificar tu identidad. Por favor, contacta con soporte.';
      return;
    }

    // Paso 2: Consultar deudas
    const step2: ProcedureStep = {
      stepNumber: 2,
      name: 'Consulta de deudas pendientes',
      status: 'in_progress',
    };
    result.steps.push(step2);

    try {
      const academicRecord = await checkAcademicRecordMock({
        studentId,
        includeCourses: false,
        includeGrades: false,
      });

      const hasDebts = academicRecord.alerts?.some((alert) =>
        alert.message.toLowerCase().includes('deuda'),
      );

      if (hasDebts) {
        step2.status = 'failed';
        step2.result = { hasDebts: true };
        step2.error = 'Deudas pendientes detectadas';
        result.finalMessage =
          'No puedo generar tu certificado porque tienes deudas pendientes. Por favor, salda tus deudas y vuelve a intentar.';
        return;
      }

      step2.status = 'completed';
      step2.result = { hasDebts: false };
    } catch (error) {
      step2.status = 'failed';
      step2.error = 'No se pudo consultar el estado de deudas';
      result.finalMessage =
        'No pudimos verificar tu estado financiero. Por favor, intenta más tarde.';
      return;
    }

    // Paso 3: Generar certificado
    const step3: ProcedureStep = {
      stepNumber: 3,
      name: 'Generación de certificado',
      status: 'in_progress',
    };
    result.steps.push(step3);

    try {
      const certificateResult = await generateCertificateMock({
        studentId,
        certificateType: parameters.certificateType || 'enrollment',
        deliveryMethod: 'email',
      });

      step3.status = 'completed';
      step3.result = certificateResult;

      result.trackingId = certificateResult.certificateId;
      result.finalMessage = `¡Listo! Tu certificado ha sido generado y enviado a tu correo electrónico. El número de seguimiento es: ${certificateResult.certificateId}`;
    } catch (error) {
      step3.status = 'failed';
      step3.error = 'Error al generar el certificado';
      result.finalMessage =
        'No pudimos generar tu certificado. Por favor, intenta más tarde o contacta con soporte.';
    }
  }

  /**
   * Ejecuta inscripción
   */
  private static async executeEnrollment(
    studentId: string,
    parameters: Record<string, any>,
    result: ProcedureExecutionResult,
    useMock: boolean,
  ): Promise<void> {
    // Paso 1: Verificar elegibilidad
    const step1: ProcedureStep = {
      stepNumber: 1,
      name: 'Verificación de elegibilidad',
      status: 'in_progress',
    };
    result.steps.push(step1);

    await new Promise((resolve) => setTimeout(resolve, 100));
    step1.status = 'completed';

    // Paso 2: Reservar cupo
    const step2: ProcedureStep = {
      stepNumber: 2,
      name: 'Reserva de cupo',
      status: 'in_progress',
    };
    result.steps.push(step2);

    await new Promise((resolve) => setTimeout(resolve, 100));
    step2.status = 'completed';

    // Paso 3: Generar factura
    const step3: ProcedureStep = {
      stepNumber: 3,
      name: 'Generación de factura',
      status: 'in_progress',
    };
    result.steps.push(step3);

    await new Promise((resolve) => setTimeout(resolve, 100));
    step3.status = 'completed';

    result.trackingId = `INS-${Date.now()}`;
    result.finalMessage = `Tu inscripción ha sido procesada exitosamente. Número de seguimiento: ${result.trackingId}. Recibirás la factura por correo electrónico.`;
  }

  /**
   * Ejecuta registro de materias
   */
  private static async executeCourseRegistration(
    studentId: string,
    parameters: Record<string, any>,
    result: ProcedureExecutionResult,
    useMock: boolean,
  ): Promise<void> {
    // Paso 1: Verificar disponibilidad
    const step1: ProcedureStep = {
      stepNumber: 1,
      name: 'Verificación de disponibilidad de cupos',
      status: 'in_progress',
    };
    result.steps.push(step1);

    await new Promise((resolve) => setTimeout(resolve, 100));
    step1.status = 'completed';

    // Paso 2: Verificar prerrequisitos
    const step2: ProcedureStep = {
      stepNumber: 2,
      name: 'Verificación de prerrequisitos',
      status: 'in_progress',
    };
    result.steps.push(step2);

    await new Promise((resolve) => setTimeout(resolve, 100));
    step2.status = 'completed';

    // Paso 3: Registrar materia
    const step3: ProcedureStep = {
      stepNumber: 3,
      name: 'Registro de materia',
      status: 'in_progress',
    };
    result.steps.push(step3);

    await new Promise((resolve) => setTimeout(resolve, 100));
    step3.status = 'completed';

    result.trackingId = `REG-${Date.now()}`;
    result.finalMessage = `Tu registro de materia ha sido completado. Número de confirmación: ${result.trackingId}. Puedes ver tu horario en el portal estudiantil.`;
  }

  /**
   * Ejecuta apelación de calificación
   */
  private static async executeGradeAppeal(
    studentId: string,
    parameters: Record<string, any>,
    result: ProcedureExecutionResult,
    useMock: boolean,
  ): Promise<void> {
    // Paso 1: Crear solicitud
    const step1: ProcedureStep = {
      stepNumber: 1,
      name: 'Creación de solicitud de apelación',
      status: 'in_progress',
    };
    result.steps.push(step1);

    await new Promise((resolve) => setTimeout(resolve, 100));
    step1.status = 'completed';

    // Paso 2: Notificar al profesor
    const step2: ProcedureStep = {
      stepNumber: 2,
      name: 'Notificación al profesor',
      status: 'in_progress',
    };
    result.steps.push(step2);

    await new Promise((resolve) => setTimeout(resolve, 100));
    step2.status = 'completed';

    result.trackingId = `APL-${Date.now()}`;
    result.finalMessage = `Tu solicitud de apelación ha sido registrada. Número de caso: ${result.trackingId}. Recibirás una respuesta en un plazo de 5 días hábiles.`;
  }

  /**
   * Ejecuta cambio de programa
   */
  private static async executeProgramChange(
    studentId: string,
    parameters: Record<string, any>,
    result: ProcedureExecutionResult,
    useMock: boolean,
  ): Promise<void> {
    // Paso 1: Evaluar elegibilidad
    const step1: ProcedureStep = {
      stepNumber: 1,
      name: 'Evaluación de elegibilidad',
      status: 'in_progress',
    };
    result.steps.push(step1);

    await new Promise((resolve) => setTimeout(resolve, 100));
    step1.status = 'completed';

    // Paso 2: Crear solicitud
    const step2: ProcedureStep = {
      stepNumber: 2,
      name: 'Creación de solicitud de cambio',
      status: 'in_progress',
    };
    result.steps.push(step2);

    await new Promise((resolve) => setTimeout(resolve, 100));
    step2.status = 'completed';

    // Paso 3: Enviar a comité académico
    const step3: ProcedureStep = {
      stepNumber: 3,
      name: 'Envío a comité académico',
      status: 'in_progress',
    };
    result.steps.push(step3);

    await new Promise((resolve) => setTimeout(resolve, 100));
    step3.status = 'completed';

    result.trackingId = `CHG-${Date.now()}`;
    result.finalMessage = `Tu solicitud de cambio de programa ha sido enviada al comité académico. Número de caso: ${result.trackingId}. Recibirás una respuesta en 10 días hábiles.`;
  }

  /**
   * Ejecuta retiro
   */
  private static async executeWithdrawal(
    studentId: string,
    parameters: Record<string, any>,
    result: ProcedureExecutionResult,
    useMock: boolean,
  ): Promise<void> {
    // Paso 1: Verificar impacto financiero
    const step1: ProcedureStep = {
      stepNumber: 1,
      name: 'Verificación de impacto financiero',
      status: 'in_progress',
    };
    result.steps.push(step1);

    await new Promise((resolve) => setTimeout(resolve, 100));
    step1.status = 'completed';

    // Paso 2: Procesar retiro
    const step2: ProcedureStep = {
      stepNumber: 2,
      name: 'Procesamiento de retiro',
      status: 'in_progress',
    };
    result.steps.push(step2);

    await new Promise((resolve) => setTimeout(resolve, 100));
    step2.status = 'completed';

    // Paso 3: Actualizar registro académico
    const step3: ProcedureStep = {
      stepNumber: 3,
      name: 'Actualización de registro académico',
      status: 'in_progress',
    };
    result.steps.push(step3);

    await new Promise((resolve) => setTimeout(resolve, 100));
    step3.status = 'completed';

    result.trackingId = `WDR-${Date.now()}`;
    result.finalMessage = `Tu retiro ha sido procesado. Número de confirmación: ${result.trackingId}. Verifica tu estado de cuenta para ajustes financieros.`;
  }
}
