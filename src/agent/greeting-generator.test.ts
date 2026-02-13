/**
 * Tests para greeting-generator
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  generateGreeting,
  generateIdentificationRequest,
  generateDetailedGreeting,
  generateReturningStudentGreeting,
  sanitizeAndFormatName,
  generateTimeBasedGreeting,
} from './greeting-generator';
import { StudentProfile } from '../types/mcp-tools';

describe('GreetingGenerator', () => {
  const mockProfile: StudentProfile = {
    studentId: 'STU001',
    firstName: 'Carlos',
    lastName: 'Rodríguez',
    email: 'carlos@universidad.edu',
    phone: '+57 300 123 4567',
    program: {
      name: 'Ingeniería Informática',
      code: 'ING-INF',
      enrollmentDate: '2022-01-15',
    },
    academicStatus: 'active',
  };

  describe('generateGreeting', () => {
    it('debe generar saludo con nombre completo', () => {
      const greeting = generateGreeting(mockProfile);

      expect(greeting).toContain('Carlos Rodríguez');
      expect(greeting).toContain('Hola');
    });

    it('debe incluir nombre del programa si está disponible', () => {
      const greeting = generateGreeting(mockProfile);

      expect(greeting).toContain('Ingeniería Informática');
    });

    it('debe incluir pregunta de ayuda', () => {
      const greeting = generateGreeting(mockProfile);

      expect(greeting).toContain('¿En qué puedo ayudarte');
    });

    it('debe solicitar identificación cuando no hay perfil', () => {
      const greeting = generateGreeting(undefined);

      expect(greeting).toContain('identificación');
      expect(greeting).not.toContain('Carlos');
    });

    it('debe manejar perfil sin programa', () => {
      const profileWithoutProgram: StudentProfile = {
        ...mockProfile,
        program: undefined,
      };

      const greeting = generateGreeting(profileWithoutProgram);

      expect(greeting).toContain('Carlos Rodríguez');
      expect(greeting).not.toContain('Ingeniería');
    });
  });

  describe('generateIdentificationRequest', () => {
    it('debe generar mensaje de solicitud de identificación', () => {
      const message = generateIdentificationRequest();

      expect(message).toContain('Hola');
      expect(message).toContain('identificación');
      expect(message).toContain('estudiante');
    });
  });

  describe('generateDetailedGreeting', () => {
    it('debe generar saludo con estado académico activo', () => {
      const greeting = generateDetailedGreeting(mockProfile, true);

      expect(greeting).toContain('Carlos Rodríguez');
      expect(greeting).toContain('activo');
    });

    it('debe generar saludo sin estado académico cuando no se solicita', () => {
      const greeting = generateDetailedGreeting(mockProfile, false);

      expect(greeting).toContain('Carlos Rodríguez');
      expect(greeting).not.toContain('activo');
    });

    it('debe manejar estado académico graduado', () => {
      const graduatedProfile: StudentProfile = {
        ...mockProfile,
        academicStatus: 'graduated',
      };

      const greeting = generateDetailedGreeting(graduatedProfile, true);

      expect(greeting).toContain('Felicitaciones');
      expect(greeting).toContain('graduación');
    });

    it('debe manejar estado académico inactivo', () => {
      const inactiveProfile: StudentProfile = {
        ...mockProfile,
        academicStatus: 'inactive',
      };

      const greeting = generateDetailedGreeting(inactiveProfile, true);

      expect(greeting).toContain('inactivo');
    });
  });

  describe('generateReturningStudentGreeting', () => {
    it('debe generar saludo de retorno con primer nombre', () => {
      const greeting = generateReturningStudentGreeting(mockProfile);

      expect(greeting).toContain('Carlos');
      expect(greeting).toContain('de nuevo');
    });

    it('debe mencionar último contacto si está disponible', () => {
      const profileWithCRM: StudentProfile = {
        ...mockProfile,
        crmData: {
          lastContact: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 días atrás
          preferredChannel: 'email',
          tags: [],
        },
      };

      const greeting = generateReturningStudentGreeting(profileWithCRM);

      expect(greeting).toContain('Carlos');
      expect(greeting).toContain('días');
    });

    it('debe manejar contacto del mismo día', () => {
      const profileWithCRM: StudentProfile = {
        ...mockProfile,
        crmData: {
          lastContact: new Date().toISOString(),
          preferredChannel: 'email',
          tags: [],
        },
      };

      const greeting = generateReturningStudentGreeting(profileWithCRM);

      expect(greeting).toContain('hoy');
    });
  });

  describe('sanitizeAndFormatName', () => {
    it('debe capitalizar nombres correctamente', () => {
      const result = sanitizeAndFormatName('carlos', 'rodríguez');

      expect(result).toBe('Carlos Rodríguez');
    });

    it('debe manejar nombres con múltiples palabras', () => {
      const result = sanitizeAndFormatName('juan carlos', 'garcía lópez');

      expect(result).toBe('Juan Carlos García López');
    });

    it('debe manejar nombres con espacios extra', () => {
      const result = sanitizeAndFormatName('  carlos  ', '  rodríguez  ');

      expect(result).toBe('Carlos Rodríguez');
    });

    it('debe manejar nombres en mayúsculas', () => {
      const result = sanitizeAndFormatName('CARLOS', 'RODRÍGUEZ');

      expect(result).toBe('Carlos Rodríguez');
    });
  });

  describe('generateTimeBasedGreeting', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('debe generar "Buenos días" en la mañana', () => {
      vi.setSystemTime(new Date('2024-01-15T08:00:00'));

      const greeting = generateTimeBasedGreeting(mockProfile);

      expect(greeting).toContain('Buenos días');
      expect(greeting).toContain('Carlos');
    });

    it('debe generar "Buenas tardes" en la tarde', () => {
      vi.setSystemTime(new Date('2024-01-15T15:00:00'));

      const greeting = generateTimeBasedGreeting(mockProfile);

      expect(greeting).toContain('Buenas tardes');
    });

    it('debe generar "Buenas noches" en la noche', () => {
      vi.setSystemTime(new Date('2024-01-15T21:00:00'));

      const greeting = generateTimeBasedGreeting(mockProfile);

      expect(greeting).toContain('Buenas noches');
    });

    it('debe incluir programa si está disponible', () => {
      vi.setSystemTime(new Date('2024-01-15T10:00:00'));

      const greeting = generateTimeBasedGreeting(mockProfile);

      expect(greeting).toContain('Ingeniería Informática');
    });
  });
});
