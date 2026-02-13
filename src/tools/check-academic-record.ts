/**
 * Herramienta MCP: checkAcademicRecord
 * Consulta el historial académico del estudiante
 * Integración con API académica vía Lambda
 */

import { CheckAcademicRecordInput, AcademicRecord } from '../types/mcp-tools';
import {
  StudentNotFoundError,
  InvalidStudentIdError,
  ServiceUnavailableError,
} from '../types/errors';
import { retryWithBackoff } from '../utils/retry';
import { logger } from '../utils/logger';

/**
 * Valida el formato del studentId
 */
function validateStudentId(studentId: string): void {
  if (!studentId || studentId.trim().length === 0) {
    throw new InvalidStudentIdError(studentId);
  }
}

/**
 * Detecta alertas académicas basadas en el historial
 */
function detectAcademicAlerts(
  courses: AcademicRecord['courses'],
  gpa: number,
): AcademicRecord['alerts'] {
  const alerts: AcademicRecord['alerts'] = [];

  // Detectar materias reprobadas
  const failedCourses = courses?.filter((c) => c.status === 'failed') || [];
  if (failedCourses.length > 0) {
    alerts.push({
      type: 'failed_course',
      message: `Tienes ${failedCourses.length} materia(s) reprobada(s): ${failedCourses.map((c) => c.courseName).join(', ')}`,
      severity: failedCourses.length > 2 ? 'high' : 'medium',
    });
  }

  // Detectar GPA bajo
  if (gpa < 3.0) {
    alerts.push({
      type: 'low_gpa',
      message: `Tu promedio académico (${gpa.toFixed(2)}) está por debajo del mínimo recomendado`,
      severity: gpa < 2.5 ? 'high' : 'medium',
    });
  }

  return alerts;
}

/**
 * Consulta el historial académico del estudiante
 */
export async function checkAcademicRecord(
  input: CheckAcademicRecordInput,
): Promise<AcademicRecord> {
  const { studentId, includeCourses = true, includeGrades = true } = input;

  // Validar entrada
  validateStudentId(studentId);

  logger.info(`Consultando historial académico del estudiante: ${studentId}`);

  try {
    // En producción, aquí se invocaría Lambda con la API académica
    // Por ahora usamos mock
    const result = await checkAcademicRecordMock(input);

    logger.info(`Historial académico recuperado para: ${studentId}`);

    return result;
  } catch (error) {
    if (
      error instanceof StudentNotFoundError ||
      error instanceof InvalidStudentIdError
    ) {
      throw error;
    }

    logger.error(`Error al consultar historial académico de ${studentId}:`, error);
    throw new ServiceUnavailableError('AcademicAPI');
  }
}

/**
 * Mock para desarrollo/testing
 * Simula datos académicos de estudiantes
 */
export async function checkAcademicRecordMock(
  input: CheckAcademicRecordInput,
): Promise<AcademicRecord> {
  validateStudentId(input.studentId);

  // Simular delay de red
  await new Promise((resolve) => setTimeout(resolve, 120));

  const { studentId, includeCourses = true, includeGrades = true, semester } = input;

  // Datos mock de historiales académicos
  const mockRecords: Record<string, AcademicRecord> = {
    STU001: {
      studentId: 'STU001',
      gpa: 2.8,
      totalCredits: 160,
      completedCredits: 80,
      academicStanding: 'warning',
      courses: [
        {
          courseCode: 'MAT101',
          courseName: 'Cálculo I',
          semester: '2023-1',
          grade: 'D',
          status: 'failed',
          credits: 4,
        },
        {
          courseCode: 'PRG101',
          courseName: 'Programación I',
          semester: '2023-1',
          grade: 'B',
          status: 'passed',
          credits: 4,
        },
        {
          courseCode: 'MAT102',
          courseName: 'Cálculo II',
          semester: '2023-2',
          grade: 'C',
          status: 'passed',
          credits: 4,
        },
        {
          courseCode: 'PRG102',
          courseName: 'Programación II',
          semester: '2023-2',
          grade: 'A',
          status: 'passed',
          credits: 4,
        },
        {
          courseCode: 'BD101',
          courseName: 'Bases de Datos',
          semester: '2024-1',
          grade: 'B',
          status: 'in_progress',
          credits: 4,
        },
      ],
    },
    STU002: {
      studentId: 'STU002',
      gpa: 3.8,
      totalCredits: 160,
      completedCredits: 120,
      academicStanding: 'good',
      courses: [
        {
          courseCode: 'ADM101',
          courseName: 'Fundamentos de Administración',
          semester: '2021-2',
          grade: 'A',
          status: 'passed',
          credits: 3,
        },
        {
          courseCode: 'ECO101',
          courseName: 'Microeconomía',
          semester: '2022-1',
          grade: 'A',
          status: 'passed',
          credits: 3,
        },
        {
          courseCode: 'FIN101',
          courseName: 'Finanzas Corporativas',
          semester: '2022-2',
          grade: 'B',
          status: 'passed',
          credits: 4,
        },
      ],
    },
  };

  const record = mockRecords[studentId];

  if (!record) {
    throw new StudentNotFoundError(studentId);
  }

  // Construir respuesta según parámetros
  const result: AcademicRecord = {
    studentId: record.studentId,
    gpa: record.gpa,
    totalCredits: record.totalCredits,
    completedCredits: record.completedCredits,
    academicStanding: record.academicStanding,
  };

  // Incluir cursos si se solicita
  if (includeCourses && record.courses) {
    let courses = record.courses;

    // Filtrar por semestre si se especifica
    if (semester) {
      courses = courses.filter((c) => c.semester === semester);
    }

    // Incluir o excluir calificaciones según parámetro
    result.courses = courses.map((c) => ({
      ...c,
      grade: includeGrades ? c.grade : '',
    }));
  }

  // Detectar alertas académicas
  result.alerts = detectAcademicAlerts(result.courses || [], result.gpa);

  return result;
}
