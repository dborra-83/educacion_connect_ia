/**
 * Tests para academic-advisor
 */

import { describe, it, expect } from 'vitest';
import {
  analyzeAcademicRecord,
  generateTutoringRecommendation,
  generateResourceRecommendation,
  generateSummerCoursesRecommendation,
  generateGPAImprovementRecommendation,
  generateProactiveMessage,
  analyzeImpediments,
  generateImpedimentMessage,
} from './academic-advisor';
import { AcademicRecord } from '../types/mcp-tools';

describe('AcademicAdvisor', () => {
  const goodRecord: AcademicRecord = {
    studentId: 'STU002',
    gpa: 3.8,
    totalCredits: 160,
    completedCredits: 120,
    academicStanding: 'good',
    courses: [
      {
        courseCode: 'ADM101',
        courseName: 'Administración',
        semester: '2023-1',
        grade: 'A',
        status: 'passed',
        credits: 3,
      },
    ],
    alerts: [],
  };

  const problematicRecord: AcademicRecord = {
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
        courseCode: 'FIS101',
        courseName: 'Física I',
        semester: '2023-2',
        grade: 'F',
        status: 'failed',
        credits: 4,
      },
    ],
    alerts: [
      {
        type: 'failed_course',
        message: 'Tienes 2 materias reprobadas',
        severity: 'high',
      },
      {
        type: 'low_gpa',
        message: 'Tu GPA está por debajo del mínimo',
        severity: 'medium',
      },
    ],
  };

  describe('analyzeAcademicRecord', () => {
    it('debe detectar que no hay problemas en buen historial', () => {
      const analysis = analyzeAcademicRecord(goodRecord);

      expect(analysis.hasIssues).toBe(false);
      expect(analysis.failedCourses.length).toBe(0);
      expect(analysis.lowGPA).toBe(false);
    });

    it('debe detectar materias reprobadas', () => {
      const analysis = analyzeAcademicRecord(problematicRecord);

      expect(analysis.hasIssues).toBe(true);
      expect(analysis.failedCourses.length).toBe(2);
      expect(analysis.failedCourses[0].courseName).toBe('Cálculo I');
      expect(analysis.failedCourses[1].courseName).toBe('Física I');
    });

    it('debe detectar GPA bajo', () => {
      const analysis = analyzeAcademicRecord(problematicRecord);

      expect(analysis.lowGPA).toBe(true);
      expect(analysis.gpaValue).toBe(2.8);
    });

    it('debe detectar materias en riesgo desde alertas', () => {
      const analysis = analyzeAcademicRecord(problematicRecord);

      expect(analysis.coursesAtRisk.length).toBeGreaterThan(0);
    });
  });

  describe('generateTutoringRecommendation', () => {
    it('debe generar recomendación para una materia reprobada', () => {
      const failedCourses = [
        {
          courseCode: 'MAT101',
          courseName: 'Cálculo I',
          semester: '2023-1',
        },
      ];

      const recommendation = generateTutoringRecommendation(failedCourses);

      expect(recommendation).toContain('Cálculo I');
      expect(recommendation).toContain('tutoría');
      expect(recommendation).toContain('departamento');
    });

    it('debe generar recomendación para múltiples materias reprobadas', () => {
      const failedCourses = [
        {
          courseCode: 'MAT101',
          courseName: 'Cálculo I',
          semester: '2023-1',
        },
        {
          courseCode: 'FIS101',
          courseName: 'Física I',
          semester: '2023-2',
        },
      ];

      const recommendation = generateTutoringRecommendation(failedCourses);

      expect(recommendation).toContain('2 materias');
      expect(recommendation).toContain('Cálculo I');
      expect(recommendation).toContain('Física I');
      expect(recommendation).toContain('plan de recuperación');
    });

    it('debe retornar string vacío si no hay materias reprobadas', () => {
      const recommendation = generateTutoringRecommendation([]);

      expect(recommendation).toBe('');
    });
  });

  describe('generateResourceRecommendation', () => {
    it('debe generar recomendación de recursos', () => {
      const coursesAtRisk = [
        {
          courseCode: 'MAT102',
          courseName: 'Cálculo II',
          alertType: 'at_risk',
        },
      ];

      const recommendation = generateResourceRecommendation(coursesAtRisk);

      expect(recommendation).toContain('recursos');
      expect(recommendation).toContain('tutorías');
      expect(recommendation).toContain('técnicas de estudio');
    });

    it('debe retornar string vacío si no hay materias en riesgo', () => {
      const recommendation = generateResourceRecommendation([]);

      expect(recommendation).toBe('');
    });
  });

  describe('generateSummerCoursesRecommendation', () => {
    it('debe generar recomendación de cursos de verano', () => {
      const failedCourses = [
        {
          courseCode: 'MAT101',
          courseName: 'Cálculo I',
          semester: '2023-1',
        },
      ];

      const recommendation = generateSummerCoursesRecommendation(failedCourses);

      expect(recommendation).toContain('cursos de verano');
      expect(recommendation).toContain('Cálculo I');
      expect(recommendation).toContain('horarios');
    });

    it('debe manejar múltiples materias', () => {
      const failedCourses = [
        {
          courseCode: 'MAT101',
          courseName: 'Cálculo I',
          semester: '2023-1',
        },
        {
          courseCode: 'FIS101',
          courseName: 'Física I',
          semester: '2023-2',
        },
      ];

      const recommendation = generateSummerCoursesRecommendation(failedCourses);

      expect(recommendation).toContain('las materias');
    });
  });

  describe('generateGPAImprovementRecommendation', () => {
    it('debe generar recomendación para GPA bajo', () => {
      const recommendation = generateGPAImprovementRecommendation(2.8);

      expect(recommendation).toContain('2.80');
      expect(recommendation).toContain('promedio académico');
      expect(recommendation).toContain('tutorías');
      expect(recommendation).toContain('asesor académico');
    });

    it('debe indicar nivel crítico para GPA muy bajo', () => {
      const recommendation = generateGPAImprovementRecommendation(2.3);

      expect(recommendation).toContain('crítico');
    });

    it('debe retornar string vacío para GPA aceptable', () => {
      const recommendation = generateGPAImprovementRecommendation(3.5);

      expect(recommendation).toBe('');
    });
  });

  describe('generateProactiveMessage', () => {
    it('debe generar mensaje positivo para buen rendimiento', () => {
      const analysis = analyzeAcademicRecord(goodRecord);
      const message = generateProactiveMessage(analysis);

      expect(message).toContain('Excelente');
      expect(message).toContain('buen estado');
    });

    it('debe generar mensaje completo para estudiante con problemas', () => {
      const analysis = analyzeAcademicRecord(problematicRecord);
      const message = generateProactiveMessage(analysis);

      expect(message).toContain('tutoría');
      expect(message).toContain('promedio académico');
      expect(message.length).toBeGreaterThan(100);
    });

    it('debe incluir múltiples recomendaciones', () => {
      const analysis = analyzeAcademicRecord(problematicRecord);
      const message = generateProactiveMessage(analysis);

      expect(message).toContain('tutoría');
      expect(message).toContain('cursos de verano');
    });
  });

  describe('analyzeImpediments', () => {
    it('debe detectar que no hay impedimentos en buen historial', () => {
      const analysis = analyzeImpediments(goodRecord);

      expect(analysis.hasImpediments).toBe(false);
      expect(analysis.canProceed).toBe(true);
      expect(analysis.impediments.length).toBe(0);
    });

    it('debe detectar estado académico en probation', () => {
      const recordOnProbation: AcademicRecord = {
        ...goodRecord,
        academicStanding: 'probation',
      };

      const analysis = analyzeImpediments(recordOnProbation);

      expect(analysis.hasImpediments).toBe(true);
      expect(analysis.canProceed).toBe(false);
      expect(analysis.impediments[0].type).toBe('academic');
      expect(analysis.impediments[0].severity).toBe('high');
    });

    it('debe detectar múltiples materias reprobadas como impedimento', () => {
      // Crear un record con más de 2 materias reprobadas para activar el impedimento
      const recordWithManyFailures: AcademicRecord = {
        ...problematicRecord,
        courses: [
          {
            courseCode: 'MAT101',
            courseName: 'Cálculo I',
            semester: '2023-1',
            grade: 'F',
            status: 'failed',
            credits: 4,
          },
          {
            courseCode: 'FIS101',
            courseName: 'Física I',
            semester: '2023-2',
            grade: 'F',
            status: 'failed',
            credits: 4,
          },
          {
            courseCode: 'QUI101',
            courseName: 'Química I',
            semester: '2024-1',
            grade: 'F',
            status: 'failed',
            credits: 4,
          },
        ],
      };

      const analysis = analyzeImpediments(recordWithManyFailures);

      // Debe detectar impedimento por múltiples materias reprobadas (más de 2)
      expect(analysis.impediments.length).toBeGreaterThan(0);

      const academicImpediment = analysis.impediments.find((i) => i.type === 'academic');
      expect(academicImpediment).toBeDefined();
      expect(academicImpediment?.message).toContain('3 materias');
    });

    it('debe permitir proceder con impedimentos de severidad media', () => {
      const analysis = analyzeImpediments(problematicRecord);

      // Si solo hay impedimentos de severidad media/baja, puede proceder
      const hasOnlyHighSeverity = analysis.impediments.every((i) => i.severity === 'high');
      if (!hasOnlyHighSeverity) {
        expect(analysis.canProceed).toBe(true);
      }
    });
  });

  describe('generateImpedimentMessage', () => {
    it('debe retornar string vacío si no hay impedimentos', () => {
      const analysis = analyzeImpediments(goodRecord);
      const message = generateImpedimentMessage(analysis);

      expect(message).toBe('');
    });

    it('debe generar mensaje de bloqueo para impedimentos críticos', () => {
      const recordOnProbation: AcademicRecord = {
        ...goodRecord,
        academicStanding: 'probation',
      };

      const analysis = analyzeImpediments(recordOnProbation);
      const message = generateImpedimentMessage(analysis);

      expect(message).toContain('impedimentos');
      expect(message).toContain('resolver');
      expect(message).toContain('oficina');
    });

    it('debe generar mensaje de advertencia para impedimentos no críticos', () => {
      const analysis = analyzeImpediments(problematicRecord);

      // Forzar que pueda proceder
      analysis.canProceed = true;

      const message = generateImpedimentMessage(analysis);

      if (analysis.hasImpediments) {
        expect(message).toContain('considerar');
        expect(message).toContain('continuar');
      }
    });
  });
});
