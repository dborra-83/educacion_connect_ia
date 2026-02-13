/**
 * Tests para checkAcademicRecord
 */

import { describe, it, expect } from 'vitest';
import { checkAcademicRecordMock } from './check-academic-record';
import { StudentNotFoundError, InvalidStudentIdError } from '../types/errors';

describe('checkAcademicRecord', () => {
  describe('Casos de éxito', () => {
    it('debe recuperar historial académico completo', async () => {
      const result = await checkAcademicRecordMock({
        studentId: 'STU001',
        includeCourses: true,
        includeGrades: true,
      });

      expect(result).toBeDefined();
      expect(result.studentId).toBe('STU001');
      expect(result.gpa).toBeGreaterThan(0);
      expect(result.totalCredits).toBeGreaterThan(0);
      expect(result.completedCredits).toBeGreaterThan(0);
      expect(result.academicStanding).toBeTruthy();
      expect(result.courses).toBeDefined();
      expect(result.courses!.length).toBeGreaterThan(0);
    });

    it('debe incluir calificaciones cuando includeGrades es true', async () => {
      const result = await checkAcademicRecordMock({
        studentId: 'STU001',
        includeCourses: true,
        includeGrades: true,
      });

      expect(result.courses).toBeDefined();
      expect(result.courses![0].grade).toBeTruthy();
    });

    it('debe excluir calificaciones cuando includeGrades es false', async () => {
      const result = await checkAcademicRecordMock({
        studentId: 'STU001',
        includeCourses: true,
        includeGrades: false,
      });

      expect(result.courses).toBeDefined();
      expect(result.courses![0].grade).toBe('');
    });

    it('debe filtrar cursos por semestre', async () => {
      const result = await checkAcademicRecordMock({
        studentId: 'STU001',
        includeCourses: true,
        semester: '2023-1',
      });

      expect(result.courses).toBeDefined();
      result.courses!.forEach((course) => {
        expect(course.semester).toBe('2023-1');
      });
    });

    it('debe retornar estudiante con buen rendimiento académico', async () => {
      const result = await checkAcademicRecordMock({
        studentId: 'STU002',
      });

      expect(result.gpa).toBeGreaterThan(3.5);
      expect(result.academicStanding).toBe('good');
    });
  });

  describe('Detección de alertas académicas', () => {
    it('debe detectar materias reprobadas', async () => {
      const result = await checkAcademicRecordMock({
        studentId: 'STU001',
        includeCourses: true,
      });

      expect(result.alerts).toBeDefined();
      const failedAlert = result.alerts!.find((a) => a.type === 'failed_course');
      expect(failedAlert).toBeDefined();
      expect(failedAlert!.message).toContain('reprobada');
    });

    it('debe detectar GPA bajo', async () => {
      const result = await checkAcademicRecordMock({
        studentId: 'STU001',
      });

      expect(result.alerts).toBeDefined();
      const lowGPAAlert = result.alerts!.find((a) => a.type === 'low_gpa');
      expect(lowGPAAlert).toBeDefined();
      expect(lowGPAAlert!.severity).toBeTruthy();
    });

    it('debe asignar severidad alta a múltiples materias reprobadas', async () => {
      const result = await checkAcademicRecordMock({
        studentId: 'STU001',
        includeCourses: true,
      });

      const failedCourses = result.courses!.filter((c) => c.status === 'failed');
      if (failedCourses.length > 2) {
        const failedAlert = result.alerts!.find((a) => a.type === 'failed_course');
        expect(failedAlert!.severity).toBe('high');
      }
    });

    it('no debe generar alertas para estudiante con buen rendimiento', async () => {
      const result = await checkAcademicRecordMock({
        studentId: 'STU002',
      });

      expect(result.alerts).toBeDefined();
      expect(result.alerts!.length).toBe(0);
    });
  });

  describe('Casos de error', () => {
    it('debe lanzar StudentNotFoundError cuando el estudiante no existe', async () => {
      await expect(
        checkAcademicRecordMock({
          studentId: 'STU999',
        }),
      ).rejects.toThrow(StudentNotFoundError);
    });

    it('debe lanzar InvalidStudentIdError cuando el ID está vacío', async () => {
      await expect(
        checkAcademicRecordMock({
          studentId: '',
        }),
      ).rejects.toThrow(InvalidStudentIdError);
    });
  });

  describe('Validación de datos', () => {
    it('debe incluir todos los campos requeridos en cada curso', async () => {
      const result = await checkAcademicRecordMock({
        studentId: 'STU001',
        includeCourses: true,
      });

      result.courses!.forEach((course) => {
        expect(course.courseCode).toBeTruthy();
        expect(course.courseName).toBeTruthy();
        expect(course.semester).toBeTruthy();
        expect(course.status).toBeTruthy();
        expect(course.credits).toBeGreaterThan(0);
      });
    });

    it('debe tener créditos completados menores o iguales a créditos totales', async () => {
      const result = await checkAcademicRecordMock({
        studentId: 'STU001',
      });

      expect(result.completedCredits).toBeLessThanOrEqual(result.totalCredits);
    });

    it('debe tener GPA entre 0 y 5', async () => {
      const result = await checkAcademicRecordMock({
        studentId: 'STU001',
      });

      expect(result.gpa).toBeGreaterThanOrEqual(0);
      expect(result.gpa).toBeLessThanOrEqual(5);
    });
  });
});
