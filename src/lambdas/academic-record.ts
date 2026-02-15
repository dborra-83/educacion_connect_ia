/**
 * Lambda Handler para API de Registros Académicos
 * Simula una API académica que retorna información de cursos y calificaciones
 */

import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const TABLE_NAME = process.env.DYNAMODB_TABLE || 'dev-student-profiles';

interface AcademicRecordRequest {
  studentId: string;
  semester?: string;
}

interface Course {
  courseId: string;
  courseName: string;
  credits: number;
  grade: number;
  status: 'completed' | 'in_progress' | 'failed' | 'at_risk';
}

interface Alert {
  type: 'academic' | 'financial' | 'gpa';
  message: string;
  severity: 'low' | 'medium' | 'high';
}

interface AcademicRecordResponse {
  studentId: string;
  semester: string;
  courses: Course[];
  alerts: Alert[];
  gpa: number;
  totalCredits: number;
  completedCredits: number;
}

export const handler = async (event: any): Promise<any> => {
  console.log('Academic Record API - Event:', JSON.stringify(event));

  try {
    const request: AcademicRecordRequest = typeof event.body === 'string' 
      ? JSON.parse(event.body) 
      : event;

    if (!request.studentId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'StudentNotFound',
          message: 'studentId es requerido'
        })
      };
    }

    // Obtener perfil del estudiante desde DynamoDB
    const getItemCommand = new GetItemCommand({
      TableName: TABLE_NAME,
      Key: {
        studentId: { S: request.studentId }
      }
    });

    const result = await dynamoClient.send(getItemCommand);

    if (!result.Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          error: 'StudentNotFound',
          message: `Estudiante ${request.studentId} no encontrado`
        })
      };
    }

    const student = unmarshall(result.Item);
    const currentSemester = request.semester || '2024-1';

    // Generar datos académicos simulados basados en el perfil
    const courses = generateCourses(student);
    const alerts = generateAlerts(student, courses);

    const response: AcademicRecordResponse = {
      studentId: request.studentId,
      semester: currentSemester,
      courses,
      alerts,
      gpa: student.gpa || 3.0,
      totalCredits: student.totalCredits || 120,
      completedCredits: student.completedCredits || 60
    };

    return {
      statusCode: 200,
      body: JSON.stringify(response)
    };

  } catch (error: any) {
    console.error('Error en Academic Record API:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'ServiceUnavailable',
        message: 'Error al consultar registros académicos'
      })
    };
  }
};

function generateCourses(student: any): Course[] {
  const program = student.program || 'General';
  const gpa = student.gpa || 3.0;
  const academicStatus = student.academicStatus || 'active';

  // Generar cursos basados en el programa y estado académico
  const courses: Course[] = [];

  if (program.includes('Ingeniería')) {
    courses.push(
      {
        courseId: 'CS401',
        courseName: 'Arquitectura de Software',
        credits: 4,
        grade: gpa >= 3.5 ? 4.2 : gpa,
        status: 'completed'
      },
      {
        courseId: 'CS402',
        courseName: 'Bases de Datos Avanzadas',
        credits: 4,
        grade: gpa >= 3.5 ? 3.8 : gpa - 0.2,
        status: 'completed'
      }
    );
  } else if (program.includes('Administración')) {
    courses.push(
      {
        courseId: 'BA401',
        courseName: 'Finanzas Corporativas',
        credits: 3,
        grade: gpa,
        status: 'completed'
      },
      {
        courseId: 'BA402',
        courseName: 'Marketing Estratégico',
        credits: 3,
        grade: gpa + 0.3,
        status: 'completed'
      }
    );
  } else if (program.includes('Derecho')) {
    courses.push(
      {
        courseId: 'LAW301',
        courseName: 'Derecho Civil',
        credits: 4,
        grade: academicStatus === 'at_risk' ? 2.0 : gpa,
        status: academicStatus === 'at_risk' ? 'failed' : 'completed'
      },
      {
        courseId: 'LAW302',
        courseName: 'Derecho Penal',
        credits: 4,
        grade: academicStatus === 'at_risk' ? 2.5 : gpa,
        status: academicStatus === 'at_risk' ? 'at_risk' : 'completed'
      }
    );
  }

  return courses;
}

function generateAlerts(student: any, courses: Course[]): Alert[] {
  const alerts: Alert[] = [];
  const gpa = student.gpa || 3.0;
  const hasDebts = student.financialStatus?.hasDebts || false;

  // Alertas académicas
  const failedCourses = courses.filter(c => c.status === 'failed');
  if (failedCourses.length > 0) {
    failedCourses.forEach(course => {
      alerts.push({
        type: 'academic',
        message: `Materia reprobada: ${course.courseName}`,
        severity: 'high'
      });
    });
  }

  const atRiskCourses = courses.filter(c => c.status === 'at_risk');
  if (atRiskCourses.length > 0) {
    atRiskCourses.forEach(course => {
      alerts.push({
        type: 'academic',
        message: `Bajo rendimiento en ${course.courseName}`,
        severity: 'medium'
      });
    });
  }

  // Alerta de GPA
  if (gpa < 2.5) {
    alerts.push({
      type: 'gpa',
      message: `GPA por debajo del mínimo requerido (${gpa})`,
      severity: 'high'
    });
  } else if (gpa < 3.0) {
    alerts.push({
      type: 'gpa',
      message: `GPA bajo (${gpa}). Se recomienda apoyo académico`,
      severity: 'medium'
    });
  }

  // Alerta financiera
  if (hasDebts) {
    const debtAmount = student.financialStatus?.totalDebt || 0;
    alerts.push({
      type: 'financial',
      message: `Deuda pendiente de $${debtAmount}`,
      severity: debtAmount > 1000 ? 'high' : 'medium'
    });
  }

  return alerts;
}
