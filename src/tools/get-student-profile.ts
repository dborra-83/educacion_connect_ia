/**
 * Herramienta MCP: getStudentProfile
 * Recupera el perfil unificado del estudiante desde DynamoDB
 * Integra datos de CRM y LMS
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { GetStudentProfileInput, StudentProfile } from '../types/mcp-tools';
import { UnifiedProfile } from '../types/models';
import {
  StudentNotFoundError,
  InvalidStudentIdError,
  ServiceUnavailableError,
} from '../types/errors';
import { retryWithBackoff } from '../utils/retry';
import { logger } from '../utils/logger';

// Cliente DynamoDB (en producción se configuraría con credenciales reales)
const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

const docClient = DynamoDBDocumentClient.from(dynamoClient);

const TABLE_NAME = process.env.STUDENT_PROFILES_TABLE || 'StudentProfiles';

/**
 * Valida el formato del studentId
 */
function validateStudentId(studentId: string): void {
  if (!studentId || studentId.trim().length === 0) {
    throw new InvalidStudentIdError(studentId);
  }

  // Validar formato básico (ajustar según necesidades)
  if (studentId.length < 3 || studentId.length > 50) {
    throw new InvalidStudentIdError(studentId);
  }
}

/**
 * Convierte UnifiedProfile de DynamoDB a StudentProfile
 */
function mapToStudentProfile(
  profile: UnifiedProfile,
  includeAcademic: boolean,
  includeCRM: boolean,
): StudentProfile {
  const result: StudentProfile = {
    studentId: profile.studentId,
    firstName: profile.firstName,
    lastName: profile.lastName,
    email: profile.email,
    phone: profile.phone,
  };

  // Incluir datos académicos si se solicita
  if (includeAcademic && profile.program) {
    result.program = {
      name: profile.program.name,
      code: profile.program.code,
      enrollmentDate: profile.program.enrollmentDate,
    };
    result.academicStatus = profile.academicStatus as 'active' | 'inactive' | 'graduated';
  }

  // Incluir datos CRM si se solicita
  if (includeCRM && profile.crmData) {
    result.crmData = {
      lastContact: profile.crmData.lastContactDate,
      preferredChannel: profile.crmData.lastContactChannel,
      tags: profile.crmData.tags,
    };
  }

  return result;
}

/**
 * Recupera el perfil del estudiante desde DynamoDB
 */
export async function getStudentProfile(
  input: GetStudentProfileInput,
): Promise<StudentProfile> {
  const { studentId, includeAcademic = true, includeCRM = true } = input;

  // Validar entrada
  validateStudentId(studentId);

  logger.info(`Recuperando perfil del estudiante: ${studentId}`);

  try {
    // Ejecutar consulta con reintentos
    const result = await retryWithBackoff(
      async () => {
        const command = new GetCommand({
          TableName: TABLE_NAME,
          Key: {
            PK: `STUDENT#${studentId}`,
            SK: 'PROFILE',
          },
        });

        return await docClient.send(command);
      },
      3, // maxRetries
      1000, // initialDelayMs
    );

    // Verificar si se encontró el perfil
    if (!result.Item) {
      logger.warn(`Perfil no encontrado para estudiante: ${studentId}`);
      throw new StudentNotFoundError(studentId);
    }

    const profile = result.Item as UnifiedProfile;

    // Mapear a StudentProfile
    const studentProfile = mapToStudentProfile(profile, includeAcademic, includeCRM);

    logger.info(`Perfil recuperado exitosamente para: ${studentId}`);

    return studentProfile;
  } catch (error) {
    // Si ya es un error conocido, re-lanzarlo
    if (
      error instanceof StudentNotFoundError ||
      error instanceof InvalidStudentIdError
    ) {
      throw error;
    }

    // Error de servicio
    logger.error(`Error al recuperar perfil de ${studentId}:`, error);
    throw new ServiceUnavailableError('DynamoDB');
  }
}

/**
 * Mock para desarrollo/testing sin AWS
 * Simula datos de estudiantes
 */
export async function getStudentProfileMock(
  input: GetStudentProfileInput,
): Promise<StudentProfile> {
  validateStudentId(input.studentId);

  // Simular delay de red
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Datos mock
  const mockProfiles: Record<string, StudentProfile> = {
    'STU001': {
      studentId: 'STU001',
      firstName: 'Carlos',
      lastName: 'Rodríguez',
      email: 'carlos.rodriguez@universidad.edu',
      phone: '+57 300 123 4567',
      program: {
        name: 'Ingeniería Informática',
        code: 'ING-INF',
        enrollmentDate: '2022-01-15',
      },
      academicStatus: 'active',
      crmData: {
        lastContact: '2024-01-10',
        preferredChannel: 'email',
        tags: ['prospecto', 'interesado-maestria'],
      },
    },
    'STU002': {
      studentId: 'STU002',
      firstName: 'María',
      lastName: 'González',
      email: 'maria.gonzalez@universidad.edu',
      phone: '+57 310 987 6543',
      program: {
        name: 'Administración de Empresas',
        code: 'ADM-EMP',
        enrollmentDate: '2021-08-20',
      },
      academicStatus: 'active',
    },
  };

  const profile = mockProfiles[input.studentId];

  if (!profile) {
    throw new StudentNotFoundError(input.studentId);
  }

  return profile;
}
