/**
 * Tests para Automatización de Trámites Administrativos
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ProcedureClassifier,
  ProcedureValidator,
  ProcedureExecutor,
  ProcedureType,
} from './procedure-automation';
import * as checkAcademicRecordModule from '../tools/check-academic-record';
import * as generateCertificateModule from '../tools/generate-certificate';

// Mock de las herramientas
vi.mock('../tools/check-academic-record');
vi.mock('../tools/generate-certificate');

describe('ProcedureClassifier', () => {
  describe('classify', () => {
    it('debe clasificar solicitud de certificado de inscripción', () => {
      const result = ProcedureClassifier.classify('Necesito un certificado de inscripción');

      expect(result.type).toBe(ProcedureType.CERTIFICATE_REQUEST);
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.parameters.certificateType).toBe('enrollment');
    });

    it('debe clasificar solicitud de certificado de calificaciones', () => {
      const result = ProcedureClassifier.classify('Quiero solicitar un certificado de notas');

      expect(result.type).toBe(ProcedureType.CERTIFICATE_REQUEST);
      expect(result.parameters.certificateType).toBe('grades');
    });

    it('debe clasificar solicitud de certificado de graduación', () => {
      const result = ProcedureClassifier.classify('Necesito mi certificado de graduación');

      expect(result.type).toBe(ProcedureType.CERTIFICATE_REQUEST);
      expect(result.parameters.certificateType).toBe('graduation');
    });

    it('debe clasificar solicitud de inscripción', () => {
      const result = ProcedureClassifier.classify('Quiero inscribirme en el programa');

      expect(result.type).toBe(ProcedureType.ENROLLMENT);
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('debe clasificar registro de materias', () => {
      const result = ProcedureClassifier.classify('Necesito registrar una materia');

      expect(result.type).toBe(ProcedureType.COURSE_REGISTRATION);
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('debe clasificar apelación de calificación', () => {
      const result = ProcedureClassifier.classify('Quiero apelar mi calificación');

      expect(result.type).toBe(ProcedureType.GRADE_APPEAL);
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('debe clasificar cambio de programa', () => {
      const result = ProcedureClassifier.classify('Quiero cambiar de carrera');

      expect(result.type).toBe(ProcedureType.PROGRAM_CHANGE);
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('debe clasificar retiro', () => {
      const result = ProcedureClassifier.classify('Necesito retirar una materia');

      expect(result.type).toBe(ProcedureType.WITHDRAWAL);
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('debe retornar UNKNOWN para mensaje no reconocido', () => {
      const result = ProcedureClassifier.classify('Hola, ¿cómo estás?');

      expect(result.type).toBe(ProcedureType.UNKNOWN);
      expect(result.confidence).toBeLessThan(0.6);
    });
  });
});

describe('ProcedureValidator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validate - CERTIFICATE_REQUEST', () => {
    it('debe validar exitosamente cuando no hay impedimentos', async () => {
      vi.spyOn(checkAcademicRecordModule, 'checkAcademicRecordMock').mockResolvedValue({
        studentId: 'S001',
        gpa: 3.5,
        totalCredits: 120,
        completedCredits: 90,
        academicStanding: 'good',
        alerts: [],
      });

      const result = await ProcedureValidator.validate(
        ProcedureType.CERTIFICATE_REQUEST,
        'S001',
        {},
      );

      expect(result.isValid).toBe(true);
      expect(result.impediments).toHaveLength(0);
    });

    it('debe invalidar cuando hay deudas pendientes', async () => {
      vi.spyOn(checkAcademicRecordModule, 'checkAcademicRecordMock').mockResolvedValue({
        studentId: 'S001',
        gpa: 3.5,
        totalCredits: 120,
        completedCredits: 90,
        academicStanding: 'good',
        alerts: [
          {
            type: 'missing_credits',
            message: 'Tienes una deuda pendiente de $500',
            severity: 'high',
          },
        ],
      });

      const result = await ProcedureValidator.validate(
        ProcedureType.CERTIFICATE_REQUEST,
        'S001',
        {},
      );

      expect(result.isValid).toBe(false);
      expect(result.impediments).toContain('Tienes deudas pendientes que deben ser saldadas');
    });

    it('debe agregar advertencia cuando está en probation', async () => {
      vi.spyOn(checkAcademicRecordModule, 'checkAcademicRecordMock').mockResolvedValue({
        studentId: 'S001',
        gpa: 2.0,
        totalCredits: 120,
        completedCredits: 90,
        academicStanding: 'probation',
        alerts: [],
      });

      const result = await ProcedureValidator.validate(
        ProcedureType.CERTIFICATE_REQUEST,
        'S001',
        {},
      );

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Estás en período de prueba académica');
    });
  });

  describe('validate - ENROLLMENT', () => {
    it('debe invalidar cuando ya tiene materias activas', async () => {
      vi.spyOn(checkAcademicRecordModule, 'checkAcademicRecordMock').mockResolvedValue({
        studentId: 'S001',
        gpa: 3.5,
        totalCredits: 120,
        completedCredits: 90,
        academicStanding: 'good',
        courses: [
          {
            courseCode: 'CS101',
            courseName: 'Intro to CS',
            semester: '2024-1',
            grade: 'A',
            status: 'in_progress',
            credits: 3,
          },
        ],
      });

      const result = await ProcedureValidator.validate(ProcedureType.ENROLLMENT, 'S001', {});

      expect(result.isValid).toBe(false);
      expect(result.impediments).toContain('Ya tienes materias activas en el semestre actual');
    });
  });

  describe('validate - COURSE_REGISTRATION', () => {
    it('debe invalidar cuando alcanza límite de créditos', async () => {
      vi.spyOn(checkAcademicRecordModule, 'checkAcademicRecordMock').mockResolvedValue({
        studentId: 'S001',
        gpa: 3.5,
        totalCredits: 120,
        completedCredits: 90,
        academicStanding: 'good',
        courses: [
          {
            courseCode: 'CS101',
            courseName: 'Intro to CS',
            semester: '2024-1',
            grade: 'A',
            status: 'in_progress',
            credits: 18,
          },
        ],
      });

      const result = await ProcedureValidator.validate(
        ProcedureType.COURSE_REGISTRATION,
        'S001',
        {},
      );

      expect(result.isValid).toBe(false);
      expect(result.impediments[0]).toContain('límite de créditos');
    });
  });

  describe('validate - PROGRAM_CHANGE', () => {
    it('debe invalidar cuando GPA es menor al mínimo', async () => {
      vi.spyOn(checkAcademicRecordModule, 'checkAcademicRecordMock').mockResolvedValue({
        studentId: 'S001',
        gpa: 2.0,
        totalCredits: 120,
        completedCredits: 15,
        academicStanding: 'good',
      });

      const result = await ProcedureValidator.validate(ProcedureType.PROGRAM_CHANGE, 'S001', {});

      expect(result.isValid).toBe(false);
      expect(result.impediments[0]).toContain('GPA mínimo');
    });

    it('debe invalidar cuando no tiene suficientes créditos', async () => {
      vi.spyOn(checkAcademicRecordModule, 'checkAcademicRecordMock').mockResolvedValue({
        studentId: 'S001',
        gpa: 3.0,
        totalCredits: 120,
        completedCredits: 5,
        academicStanding: 'good',
      });

      const result = await ProcedureValidator.validate(ProcedureType.PROGRAM_CHANGE, 'S001', {});

      expect(result.isValid).toBe(false);
      expect(result.impediments[0]).toContain('créditos completados');
    });
  });

  describe('validate - WITHDRAWAL', () => {
    it('debe invalidar cuando no tiene materias activas', async () => {
      vi.spyOn(checkAcademicRecordModule, 'checkAcademicRecordMock').mockResolvedValue({
        studentId: 'S001',
        gpa: 3.5,
        totalCredits: 120,
        completedCredits: 90,
        academicStanding: 'good',
        courses: [],
      });

      const result = await ProcedureValidator.validate(ProcedureType.WITHDRAWAL, 'S001', {});

      expect(result.isValid).toBe(false);
      expect(result.missingRequirements).toContain('No tienes materias activas para retirar');
    });

    it('debe agregar advertencia sobre impacto', async () => {
      vi.spyOn(checkAcademicRecordModule, 'checkAcademicRecordMock').mockResolvedValue({
        studentId: 'S001',
        gpa: 3.5,
        totalCredits: 120,
        completedCredits: 90,
        academicStanding: 'good',
        courses: [
          {
            courseCode: 'CS101',
            courseName: 'Intro to CS',
            semester: '2024-1',
            grade: 'A',
            status: 'in_progress',
            credits: 3,
          },
        ],
      });

      const result = await ProcedureValidator.validate(ProcedureType.WITHDRAWAL, 'S001', {});

      expect(result.isValid).toBe(true);
      expect(result.warnings[0]).toContain('progreso académico');
    });
  });
});

describe('ProcedureExecutor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('execute - CERTIFICATE_REQUEST', () => {
    it('debe ejecutar exitosamente solicitud de certificado sin deudas', async () => {
      vi.spyOn(checkAcademicRecordModule, 'checkAcademicRecordMock').mockResolvedValue({
        studentId: 'S001',
        gpa: 3.5,
        totalCredits: 120,
        completedCredits: 90,
        academicStanding: 'good',
        alerts: [],
      });

      vi.spyOn(generateCertificateModule, 'generateCertificateMock').mockResolvedValue({
        certificateId: 'CERT-12345',
        status: 'sent',
        generatedAt: '2024-01-15T10:00:00Z',
        deliveryStatus: {
          method: 'email',
          destination: 'student@example.com',
          sentAt: '2024-01-15T10:01:00Z',
        },
      });

      const result = await ProcedureExecutor.execute(
        ProcedureType.CERTIFICATE_REQUEST,
        'S001',
        { certificateType: 'enrollment' },
      );

      expect(result.success).toBe(true);
      expect(result.steps).toHaveLength(3);
      expect(result.steps[0].name).toBe('Verificación de identidad');
      expect(result.steps[1].name).toBe('Consulta de deudas pendientes');
      expect(result.steps[2].name).toBe('Generación de certificado');
      expect(result.steps.every((s) => s.status === 'completed')).toBe(true);
      expect(result.trackingId).toBe('CERT-12345');
      expect(result.finalMessage).toContain('certificado ha sido generado');
    });

    it('debe fallar cuando hay deudas pendientes', async () => {
      vi.spyOn(checkAcademicRecordModule, 'checkAcademicRecordMock').mockResolvedValue({
        studentId: 'S001',
        gpa: 3.5,
        totalCredits: 120,
        completedCredits: 90,
        academicStanding: 'good',
        alerts: [
          {
            type: 'missing_credits',
            message: 'Tienes una deuda pendiente',
            severity: 'high',
          },
        ],
      });

      const result = await ProcedureExecutor.execute(
        ProcedureType.CERTIFICATE_REQUEST,
        'S001',
        { certificateType: 'enrollment' },
      );

      expect(result.success).toBe(false);
      expect(result.steps).toHaveLength(2);
      expect(result.finalMessage).toContain('deudas pendientes');
    });

    it('debe comunicar estado en cada paso', async () => {
      vi.spyOn(checkAcademicRecordModule, 'checkAcademicRecordMock').mockResolvedValue({
        studentId: 'S001',
        gpa: 3.5,
        totalCredits: 120,
        completedCredits: 90,
        academicStanding: 'good',
        alerts: [],
      });

      vi.spyOn(generateCertificateModule, 'generateCertificateMock').mockResolvedValue({
        certificateId: 'CERT-12345',
        status: 'sent',
        generatedAt: '2024-01-15T10:00:00Z',
      });

      const result = await ProcedureExecutor.execute(
        ProcedureType.CERTIFICATE_REQUEST,
        'S001',
        { certificateType: 'enrollment' },
      );

      // Verificar que cada paso tiene un nombre descriptivo
      expect(result.steps[0].name).toBeTruthy();
      expect(result.steps[1].name).toBeTruthy();
      expect(result.steps[2].name).toBeTruthy();

      // Verificar que cada paso tiene un número
      expect(result.steps[0].stepNumber).toBe(1);
      expect(result.steps[1].stepNumber).toBe(2);
      expect(result.steps[2].stepNumber).toBe(3);
    });
  });

  describe('execute - ENROLLMENT', () => {
    it('debe ejecutar inscripción con todos los pasos', async () => {
      const result = await ProcedureExecutor.execute(ProcedureType.ENROLLMENT, 'S001', {});

      expect(result.success).toBe(true);
      expect(result.steps).toHaveLength(3);
      expect(result.steps[0].name).toBe('Verificación de elegibilidad');
      expect(result.steps[1].name).toBe('Reserva de cupo');
      expect(result.steps[2].name).toBe('Generación de factura');
      expect(result.trackingId).toMatch(/^INS-/);
      expect(result.finalMessage).toContain('inscripción ha sido procesada');
    });
  });

  describe('execute - COURSE_REGISTRATION', () => {
    it('debe ejecutar registro de materia con todos los pasos', async () => {
      const result = await ProcedureExecutor.execute(
        ProcedureType.COURSE_REGISTRATION,
        'S001',
        {},
      );

      expect(result.success).toBe(true);
      expect(result.steps).toHaveLength(3);
      expect(result.steps[0].name).toBe('Verificación de disponibilidad de cupos');
      expect(result.steps[1].name).toBe('Verificación de prerrequisitos');
      expect(result.steps[2].name).toBe('Registro de materia');
      expect(result.trackingId).toMatch(/^REG-/);
    });
  });

  describe('execute - GRADE_APPEAL', () => {
    it('debe ejecutar apelación con todos los pasos', async () => {
      const result = await ProcedureExecutor.execute(ProcedureType.GRADE_APPEAL, 'S001', {});

      expect(result.success).toBe(true);
      expect(result.steps).toHaveLength(2);
      expect(result.steps[0].name).toBe('Creación de solicitud de apelación');
      expect(result.steps[1].name).toBe('Notificación al profesor');
      expect(result.trackingId).toMatch(/^APL-/);
      expect(result.finalMessage).toContain('apelación ha sido registrada');
    });
  });

  describe('execute - PROGRAM_CHANGE', () => {
    it('debe ejecutar cambio de programa con todos los pasos', async () => {
      const result = await ProcedureExecutor.execute(ProcedureType.PROGRAM_CHANGE, 'S001', {});

      expect(result.success).toBe(true);
      expect(result.steps).toHaveLength(3);
      expect(result.steps[0].name).toBe('Evaluación de elegibilidad');
      expect(result.steps[1].name).toBe('Creación de solicitud de cambio');
      expect(result.steps[2].name).toBe('Envío a comité académico');
      expect(result.trackingId).toMatch(/^CHG-/);
      expect(result.finalMessage).toContain('comité académico');
    });
  });

  describe('execute - WITHDRAWAL', () => {
    it('debe ejecutar retiro con todos los pasos', async () => {
      const result = await ProcedureExecutor.execute(ProcedureType.WITHDRAWAL, 'S001', {});

      expect(result.success).toBe(true);
      expect(result.steps).toHaveLength(3);
      expect(result.steps[0].name).toBe('Verificación de impacto financiero');
      expect(result.steps[1].name).toBe('Procesamiento de retiro');
      expect(result.steps[2].name).toBe('Actualización de registro académico');
      expect(result.trackingId).toMatch(/^WDR-/);
      expect(result.finalMessage).toContain('retiro ha sido procesado');
    });
  });

  describe('execute - Ejecución secuencial', () => {
    it('debe ejecutar pasos en orden secuencial', async () => {
      vi.spyOn(checkAcademicRecordModule, 'checkAcademicRecordMock').mockResolvedValue({
        studentId: 'S001',
        gpa: 3.5,
        totalCredits: 120,
        completedCredits: 90,
        academicStanding: 'good',
        alerts: [],
      });

      vi.spyOn(generateCertificateModule, 'generateCertificateMock').mockResolvedValue({
        certificateId: 'CERT-12345',
        status: 'sent',
        generatedAt: '2024-01-15T10:00:00Z',
      });

      const result = await ProcedureExecutor.execute(
        ProcedureType.CERTIFICATE_REQUEST,
        'S001',
        { certificateType: 'enrollment' },
      );

      // Verificar que los pasos están en orden
      expect(result.steps[0].stepNumber).toBe(1);
      expect(result.steps[1].stepNumber).toBe(2);
      expect(result.steps[2].stepNumber).toBe(3);

      // Verificar que todos se completaron
      expect(result.steps.every((s) => s.status === 'completed')).toBe(true);
    });
  });

  describe('execute - Tipo desconocido', () => {
    it('debe retornar mensaje de error para tipo no soportado', async () => {
      const result = await ProcedureExecutor.execute(ProcedureType.UNKNOWN, 'S001', {});

      expect(result.success).toBe(false);
      expect(result.finalMessage).toContain('no soportado');
    });
  });
});
