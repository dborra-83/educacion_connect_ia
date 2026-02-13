/**
 * Asesor Académico Proactivo
 * Analiza el historial académico y genera recomendaciones personalizadas
 */

import { AcademicRecord } from '../types/mcp-tools';
import { logger } from '../utils/logger';

/**
 * Resultado del análisis académico
 */
export interface AcademicAnalysis {
  hasIssues: boolean;
  failedCourses: Array<{
    courseCode: string;
    courseName: string;
    semester: string;
  }>;
  coursesAtRisk: Array<{
    courseCode: string;
    courseName: string;
    alertType: string;
  }>;
  lowGPA: boolean;
  gpaValue: number;
  recommendations: string[];
}

/**
 * Analiza el historial académico del estudiante
 * Detecta materias reprobadas, en riesgo y bajo GPA
 */
export function analyzeAcademicRecord(record: AcademicRecord): AcademicAnalysis {
  logger.info(`Analizando historial académico de: ${record.studentId}`);

  const analysis: AcademicAnalysis = {
    hasIssues: false,
    failedCourses: [],
    coursesAtRisk: [],
    lowGPA: false,
    gpaValue: record.gpa,
    recommendations: [],
  };

  // Detectar materias reprobadas
  if (record.courses) {
    analysis.failedCourses = record.courses
      .filter((course) => course.status === 'failed')
      .map((course) => ({
        courseCode: course.courseCode,
        courseName: course.courseName,
        semester: course.semester,
      }));
  }

  // Detectar materias en riesgo desde las alertas
  if (record.alerts) {
    const riskAlerts = record.alerts.filter(
      (alert) => alert.type === 'failed_course' || alert.severity === 'high',
    );

    analysis.coursesAtRisk = riskAlerts.map((alert) => ({
      courseCode: '',
      courseName: alert.message,
      alertType: alert.type,
    }));
  }

  // Detectar GPA bajo
  analysis.lowGPA = record.gpa < 3.0;

  // Determinar si hay problemas
  analysis.hasIssues =
    analysis.failedCourses.length > 0 || analysis.coursesAtRisk.length > 0 || analysis.lowGPA;

  logger.info(
    `Análisis completado: ${analysis.hasIssues ? 'Se detectaron problemas' : 'Sin problemas'}`,
  );

  return analysis;
}

/**
 * Genera recomendaciones de tutoría para materias reprobadas
 */
export function generateTutoringRecommendation(
  failedCourses: AcademicAnalysis['failedCourses'],
): string {
  if (failedCourses.length === 0) {
    return '';
  }

  const courseNames = failedCourses.map((c) => c.courseName).join(', ');

  if (failedCourses.length === 1) {
    return `Veo que tienes una materia reprobada: ${courseNames}. Te recomiendo agendar una tutoría con el departamento correspondiente para reforzar estos conceptos. ¿Te gustaría que te ayude a programar una sesión de tutoría?`;
  } else {
    return `Noto que tienes ${failedCourses.length} materias reprobadas: ${courseNames}. Es importante que recibas apoyo académico. Te recomiendo agendar tutorías con los departamentos correspondientes. ¿Te gustaría que te ayude a organizar un plan de recuperación?`;
  }
}

/**
 * Genera recomendaciones de recursos académicos para materias en riesgo
 */
export function generateResourceRecommendation(
  coursesAtRisk: AcademicAnalysis['coursesAtRisk'],
): string {
  if (coursesAtRisk.length === 0) {
    return '';
  }

  return `He notado algunas alertas en tu historial académico. Te recomiendo aprovechar los recursos disponibles como:\n- Centro de tutorías académicas\n- Talleres de técnicas de estudio\n- Asesoría con profesores\n- Grupos de estudio\n\n¿Te gustaría más información sobre estos recursos?`;
}

/**
 * Genera recomendación de cursos de verano
 */
export function generateSummerCoursesRecommendation(
  failedCourses: AcademicAnalysis['failedCourses'],
): string {
  if (failedCourses.length === 0) {
    return '';
  }

  const courseNames = failedCourses.map((c) => c.courseName).join(', ');

  return `Para recuperar ${failedCourses.length === 1 ? 'la materia' : 'las materias'} ${courseNames}, puedes inscribirte en los cursos de verano. Estos cursos intensivos te permitirán ponerte al día más rápidamente. ¿Te gustaría conocer los horarios y fechas disponibles?`;
}

/**
 * Genera recomendación para mejorar GPA
 */
export function generateGPAImprovementRecommendation(gpa: number): string {
  if (gpa >= 3.0) {
    return '';
  }

  const severity = gpa < 2.5 ? 'crítico' : 'bajo';

  return `Tu promedio académico actual es ${gpa.toFixed(2)}, lo cual está ${severity === 'crítico' ? 'en nivel crítico' : 'por debajo del mínimo recomendado'}. Te sugiero:\n- Priorizar las materias con mayor peso crediticio\n- Asistir a todas las tutorías disponibles\n- Establecer un horario de estudio regular\n- Considerar reducir la carga académica si es necesario\n\n¿Te gustaría hablar con un asesor académico para crear un plan de mejora?`;
}

/**
 * Genera mensaje proactivo completo basado en el análisis
 */
export function generateProactiveMessage(analysis: AcademicAnalysis): string {
  if (!analysis.hasIssues) {
    return '¡Excelente! Tu rendimiento académico está en buen estado. Sigue así.';
  }

  const messages: string[] = [];

  // Agregar recomendación de tutoría si hay materias reprobadas
  if (analysis.failedCourses.length > 0) {
    messages.push(generateTutoringRecommendation(analysis.failedCourses));
  }

  // Agregar recomendación de recursos si hay materias en riesgo
  if (analysis.coursesAtRisk.length > 0) {
    messages.push(generateResourceRecommendation(analysis.coursesAtRisk));
  }

  // Agregar recomendación de GPA si está bajo
  if (analysis.lowGPA) {
    messages.push(generateGPAImprovementRecommendation(analysis.gpaValue));
  }

  // Agregar recomendación de cursos de verano
  if (analysis.failedCourses.length > 0) {
    messages.push(generateSummerCoursesRecommendation(analysis.failedCourses));
  }

  return messages.filter((m) => m.length > 0).join('\n\n');
}

/**
 * Analiza impedimentos antes de realizar un trámite
 */
export interface ImpedimentAnalysis {
  hasImpediments: boolean;
  impediments: Array<{
    type: 'academic' | 'financial';
    severity: 'high' | 'medium' | 'low';
    message: string;
  }>;
  canProceed: boolean;
}

/**
 * Analiza impedimentos académicos y financieros antes de un trámite
 */
export function analyzeImpediments(record: AcademicRecord): ImpedimentAnalysis {
  const analysis: ImpedimentAnalysis = {
    hasImpediments: false,
    impediments: [],
    canProceed: true,
  };

  // Verificar deudas financieras
  if (record.alerts) {
    const financialAlerts = record.alerts.filter((alert) =>
      alert.message.toLowerCase().includes('deuda'),
    );

    financialAlerts.forEach((alert) => {
      analysis.impediments.push({
        type: 'financial',
        severity: alert.severity as 'high' | 'medium' | 'low',
        message: alert.message,
      });
    });
  }

  // Verificar estado académico
  if (record.academicStanding === 'probation') {
    analysis.impediments.push({
      type: 'academic',
      severity: 'high',
      message: 'Estás en período de prueba académica',
    });
  }

  // Verificar materias reprobadas críticas
  const criticalFailures = record.courses?.filter((c) => c.status === 'failed').length || 0;
  if (criticalFailures > 2) {
    analysis.impediments.push({
      type: 'academic',
      severity: 'medium',
      message: `Tienes ${criticalFailures} materias reprobadas`,
    });
  }

  analysis.hasImpediments = analysis.impediments.length > 0;

  // Determinar si puede proceder (solo bloquear por impedimentos de alta severidad)
  const highSeverityImpediments = analysis.impediments.filter((i) => i.severity === 'high');
  analysis.canProceed = highSeverityImpediments.length === 0;

  return analysis;
}

/**
 * Genera mensaje de impedimentos
 */
export function generateImpedimentMessage(analysis: ImpedimentAnalysis): string {
  if (!analysis.hasImpediments) {
    return '';
  }

  const messages = analysis.impediments.map((imp) => `- ${imp.message}`).join('\n');

  if (!analysis.canProceed) {
    return `He detectado algunos impedimentos que deben resolverse antes de continuar:\n\n${messages}\n\nPor favor, contacta con la oficina correspondiente para resolver estos asuntos.`;
  }

  return `He notado algunos aspectos que deberías considerar:\n\n${messages}\n\nAunque puedes continuar con el trámite, te recomiendo atender estos puntos pronto.`;
}
