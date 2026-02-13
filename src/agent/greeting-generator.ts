/**
 * Generador de saludos personalizados
 * Crea mensajes de bienvenida basados en el perfil del estudiante
 */

import { StudentProfile } from '../types/mcp-tools';
import { logger } from '../utils/logger';

/**
 * Genera un saludo personalizado con el nombre completo del estudiante
 */
export function generateGreeting(profile?: StudentProfile): string {
  // Si no hay perfil, solicitar identificación
  if (!profile) {
    return generateIdentificationRequest();
  }

  const fullName = `${profile.firstName} ${profile.lastName}`;

  // Saludo básico con nombre
  let greeting = `¡Hola ${fullName}! `;

  // Agregar información del programa si está disponible
  if (profile.program) {
    greeting += `Veo que estás inscrito en ${profile.program.name}. `;
  }

  // Agregar mensaje de bienvenida
  greeting += '¿En qué puedo ayudarte hoy?';

  logger.info(`Saludo generado para: ${profile.studentId}`);

  return greeting;
}

/**
 * Genera mensaje solicitando identificación cuando no hay perfil
 */
export function generateIdentificationRequest(): string {
  return '¡Hola! Bienvenido al asistente virtual de la universidad. Para poder ayudarte mejor, ¿podrías proporcionarme tu número de identificación de estudiante?';
}

/**
 * Genera saludo con información adicional del estado académico
 */
export function generateDetailedGreeting(
  profile: StudentProfile,
  includeAcademicStatus: boolean = false,
): string {
  const fullName = `${profile.firstName} ${profile.lastName}`;

  let greeting = `¡Hola ${fullName}! `;

  // Agregar información del programa
  if (profile.program) {
    greeting += `Veo que estás inscrito en ${profile.program.name}. `;
  }

  // Agregar estado académico si se solicita
  if (includeAcademicStatus && profile.academicStatus) {
    const statusMessages: Record<string, string> = {
      active: 'Tu estado académico está activo.',
      inactive: 'Noto que tu estado académico está inactivo.',
      graduated: '¡Felicitaciones por tu graduación!',
    };

    const statusMessage = statusMessages[profile.academicStatus];
    if (statusMessage) {
      greeting += `${statusMessage} `;
    }
  }

  greeting += '¿En qué puedo ayudarte hoy?';

  return greeting;
}

/**
 * Genera saludo de retorno para estudiantes que ya han interactuado antes
 */
export function generateReturningStudentGreeting(profile: StudentProfile): string {
  const firstName = profile.firstName;

  let greeting = `¡Hola de nuevo, ${firstName}! `;

  // Agregar información de último contacto si está disponible
  if (profile.crmData?.lastContact) {
    const lastContactDate = new Date(profile.crmData.lastContact);
    const daysSinceLastContact = Math.floor(
      (Date.now() - lastContactDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysSinceLastContact === 0) {
      greeting += 'Me alegra verte de nuevo hoy. ';
    } else if (daysSinceLastContact === 1) {
      greeting += 'Me alegra verte de nuevo. ';
    } else if (daysSinceLastContact < 7) {
      greeting += `Me alegra verte de nuevo después de ${daysSinceLastContact} días. `;
    }
  }

  greeting += '¿En qué puedo ayudarte?';

  return greeting;
}

/**
 * Genera saludo con manejo de caracteres especiales en nombres
 */
export function sanitizeAndFormatName(firstName: string, lastName: string): string {
  // Capitalizar primera letra de cada palabra
  const capitalize = (str: string) => {
    return str
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const sanitizedFirstName = capitalize(firstName.trim());
  const sanitizedLastName = capitalize(lastName.trim());

  return `${sanitizedFirstName} ${sanitizedLastName}`;
}

/**
 * Genera saludo según hora del día
 */
export function generateTimeBasedGreeting(profile: StudentProfile): string {
  const hour = new Date().getHours();
  const firstName = profile.firstName;

  let timeGreeting: string;

  if (hour >= 5 && hour < 12) {
    timeGreeting = '¡Buenos días';
  } else if (hour >= 12 && hour < 19) {
    timeGreeting = '¡Buenas tardes';
  } else {
    timeGreeting = '¡Buenas noches';
  }

  let greeting = `${timeGreeting}, ${firstName}! `;

  if (profile.program) {
    greeting += `Veo que estás en ${profile.program.name}. `;
  }

  greeting += '¿Cómo puedo ayudarte?';

  return greeting;
}
