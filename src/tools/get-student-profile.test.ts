/**
 * Tests para getStudentProfile
 */

import { describe, it, expect } from 'vitest';
import { getStudentProfileMock } from './get-student-profile';
import { StudentNotFoundError, InvalidStudentIdError } from '../types/errors';

describe('getStudentProfile', () => {
  describe('Casos de éxito', () => {
    it('debe recuperar perfil completo de estudiante existente', async () => {
      const result = await getStudentProfileMock({
        studentId: 'STU001',
        includeAcademic: true,
        includeCRM: true,
      });

      expect(result).toBeDefined();
      expect(result.studentId).toBe('STU001');
      expect(result.firstName).toBe('Carlos');
      expect(result.lastName).toBe('Rodríguez');
      expect(result.email).toContain('@universidad.edu');
      expect(result.program).toBeDefined();
      expect(result.program?.name).toBe('Ingeniería Informática');
      expect(result.crmData).toBeDefined();
    });

    it('debe recuperar perfil sin datos CRM cuando includeCRM es false', async () => {
      const result = await getStudentProfileMock({
        studentId: 'STU002',
        includeAcademic: true,
        includeCRM: false,
      });

      expect(result).toBeDefined();
      expect(result.studentId).toBe('STU002');
      expect(result.crmData).toBeUndefined();
    });
  });

  describe('Casos de error', () => {
    it('debe lanzar StudentNotFoundError cuando el estudiante no existe', async () => {
      await expect(
        getStudentProfileMock({
          studentId: 'STU999',
        }),
      ).rejects.toThrow(StudentNotFoundError);
    });

    it('debe lanzar InvalidStudentIdError cuando el ID está vacío', async () => {
      await expect(
        getStudentProfileMock({
          studentId: '',
        }),
      ).rejects.toThrow(InvalidStudentIdError);
    });

    it('debe lanzar InvalidStudentIdError cuando el ID es muy corto', async () => {
      await expect(
        getStudentProfileMock({
          studentId: 'AB',
        }),
      ).rejects.toThrow(InvalidStudentIdError);
    });
  });

  describe('Validación de datos', () => {
    it('debe retornar email válido', async () => {
      const result = await getStudentProfileMock({
        studentId: 'STU001',
      });

      expect(result.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    });

    it('debe retornar teléfono con formato válido', async () => {
      const result = await getStudentProfileMock({
        studentId: 'STU001',
      });

      expect(result.phone).toBeTruthy();
      expect(result.phone.length).toBeGreaterThan(5);
    });

    it('debe retornar programa académico con código', async () => {
      const result = await getStudentProfileMock({
        studentId: 'STU001',
        includeAcademic: true,
      });

      expect(result.program).toBeDefined();
      expect(result.program?.code).toBeTruthy();
      expect(result.program?.name).toBeTruthy();
    });
  });
});
