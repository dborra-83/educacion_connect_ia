/**
 * Gestor de perfiles de estudiantes
 * Maneja la recuperación y caché de perfiles durante la sesión
 */

import { StudentProfile } from '../types/mcp-tools';
import { ConversationContext } from '../types/models';
import { getStudentProfile, getStudentProfileMock } from '../tools/get-student-profile';
import { logger } from '../utils/logger';

/**
 * Extrae el studentId del contexto de Amazon Connect
 * En producción, esto vendría del evento de Amazon Connect
 */
export function extractStudentIdFromContext(connectEvent: any): string | undefined {
  // Intentar obtener de diferentes fuentes
  const studentId =
    connectEvent?.Details?.ContactData?.Attributes?.studentId ||
    connectEvent?.Details?.Parameters?.studentId ||
    connectEvent?.studentId;

  return studentId;
}

/**
 * Recupera el perfil del estudiante al iniciar la conversación
 * Implementa caché en el contexto de conversación
 */
export async function retrieveStudentProfile(
  context: ConversationContext,
  useMock: boolean = true,
): Promise<StudentProfile | undefined> {
  // Si ya tenemos el perfil en caché, retornarlo
  if (context.studentProfile) {
    logger.debug(`Perfil recuperado de caché para: ${context.studentId}`);
    return context.studentProfile;
  }

  // Si no tenemos studentId, no podemos recuperar el perfil
  if (!context.studentId) {
    logger.warn('No se puede recuperar perfil: studentId no disponible');
    return undefined;
  }

  try {
    logger.info(`Recuperando perfil para estudiante: ${context.studentId}`);

    // Usar mock o función real según configuración
    const getProfileFn = useMock ? getStudentProfileMock : getStudentProfile;

    const profile = await getProfileFn({
      studentId: context.studentId,
      includeAcademic: true,
      includeCRM: true,
    });

    // Almacenar en caché en el contexto
    context.studentProfile = profile;

    logger.info(`Perfil recuperado y cacheado para: ${context.studentId}`);

    return profile;
  } catch (error) {
    logger.error(`Error al recuperar perfil de ${context.studentId}:`, error);
    return undefined;
  }
}

/**
 * Inicializa el contexto de conversación con el perfil del estudiante
 */
export async function initializeConversationContext(
  sessionId: string,
  connectEvent: any,
  useMock: boolean = true,
): Promise<ConversationContext> {
  const studentId = extractStudentIdFromContext(connectEvent);

  const context: ConversationContext = {
    sessionId,
    studentId,
    conversationHistory: [],
    entities: new Map(),
  };

  // Intentar recuperar el perfil si tenemos studentId
  if (studentId) {
    await retrieveStudentProfile(context, useMock);
  }

  return context;
}

/**
 * Valida si los datos proporcionados por el usuario contradicen el perfil
 */
export function validateUserDataAgainstProfile(
  userProvidedData: Record<string, any>,
  profile: StudentProfile,
): { hasContradiction: boolean; contradictions: string[] } {
  const contradictions: string[] = [];

  // Validar email
  if (userProvidedData.email && userProvidedData.email !== profile.email) {
    contradictions.push(
      `Email proporcionado (${userProvidedData.email}) no coincide con el registrado (${profile.email})`,
    );
  }

  // Validar teléfono
  if (userProvidedData.phone && userProvidedData.phone !== profile.phone) {
    contradictions.push(
      `Teléfono proporcionado (${userProvidedData.phone}) no coincide con el registrado (${profile.phone})`,
    );
  }

  // Validar nombre
  if (
    userProvidedData.firstName &&
    userProvidedData.firstName.toLowerCase() !== profile.firstName.toLowerCase()
  ) {
    contradictions.push(
      `Nombre proporcionado (${userProvidedData.firstName}) no coincide con el registrado (${profile.firstName})`,
    );
  }

  // Validar programa
  if (
    userProvidedData.program &&
    profile.program &&
    userProvidedData.program !== profile.program.code &&
    userProvidedData.program !== profile.program.name
  ) {
    contradictions.push(
      `Programa proporcionado (${userProvidedData.program}) no coincide con el registrado (${profile.program.name})`,
    );
  }

  return {
    hasContradiction: contradictions.length > 0,
    contradictions,
  };
}

/**
 * Genera mensaje de confirmación cuando hay datos contradictorios
 */
export function generateConfirmationMessage(contradictions: string[]): string {
  const contradictionList = contradictions.map((c, i) => `${i + 1}. ${c}`).join('\n');

  return `He notado algunas diferencias con la información que tengo registrada:\n\n${contradictionList}\n\n¿Podrías confirmar cuál es la información correcta?`;
}
