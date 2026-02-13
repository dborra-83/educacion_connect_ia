/**
 * Motor de Razonamiento del Agente
 * Implementa el ciclo completo: identificar intención → recuperar contexto → analizar → ejecutar → responder
 */

import { ConversationContext, AgentResponse } from '../types/models';
import { retrieveStudentProfile } from './profile-manager';
import { generateGreeting, generateTimeBasedGreeting } from './greeting-generator';
import { queryKnowledgeBaseMock } from '../tools/query-knowledge-base';
import { checkAcademicRecordMock } from '../tools/check-academic-record';
import {
  analyzeAcademicRecord,
  generateProactiveMessage,
  analyzeImpediments,
} from './academic-advisor';
import { orchestrateCertificateGeneration } from './certificate-orchestrator';
import { logger } from '../utils/logger';

/**
 * Tipos de intención que el agente puede detectar
 */
export enum IntentType {
  GREETING = 'greeting',
  REQUEST_CERTIFICATE = 'request_certificate',
  QUERY_PROGRAM = 'query_program',
  CHECK_ACADEMIC_STATUS = 'check_academic_status',
  REQUEST_HELP = 'request_help',
  UNKNOWN = 'unknown',
}

/**
 * Resultado del análisis de intención
 */
export interface IntentAnalysis {
  intent: IntentType;
  confidence: number;
  entities: Record<string, any>;
}

/**
 * Motor de razonamiento del agente
 */
export class ReasoningEngine {
  private useMock: boolean;

  constructor(useMock: boolean = true) {
    this.useMock = useMock;
  }

  /**
   * Procesa un mensaje del usuario y genera una respuesta
   * Implementa el ciclo completo de razonamiento
   */
  async processMessage(userMessage: string, context: ConversationContext): Promise<AgentResponse> {
    const startTime = Date.now();

    logger.info(`Procesando mensaje: "${userMessage}"`);

    try {
      // 1. Identificar la intención del usuario
      const intentAnalysis = this.identifyIntent(userMessage, context);
      context.currentIntent = intentAnalysis.intent;

      logger.info(`Intención detectada: ${intentAnalysis.intent} (${intentAnalysis.confidence})`);

      // 2. Recuperar contexto necesario (perfil si no está cacheado)
      if (!context.studentProfile && context.studentId) {
        await retrieveStudentProfile(context, this.useMock);
      }

      // 3. Analizar situación del estudiante
      const situationAnalysis = await this.analyzeSituation(context, intentAnalysis);

      // 4. Determinar y ejecutar acciones
      const actionResult = await this.executeActions(intentAnalysis, context, situationAnalysis);

      // 5. Generar respuesta personalizada
      const response = this.generateResponse(actionResult, context, intentAnalysis);

      // 6. Actualizar historial de conversación
      this.updateConversationHistory(context, userMessage, response.message);

      // 7. Calcular tiempo de procesamiento
      const processingTime = Date.now() - startTime;
      response.metadata = {
        ...response.metadata,
        processingTime,
      };

      logger.info(`Mensaje procesado en ${processingTime}ms`);

      return response;
    } catch (error) {
      logger.error('Error en motor de razonamiento:', error);

      return {
        message: 'Disculpa, tuve un problema al procesar tu solicitud. ¿Podrías intentar de nuevo?',
        requiresHumanEscalation: true,
        metadata: {
          toolsUsed: [],
          processingTime: Date.now() - startTime,
        },
      };
    }
  }

  /**
   * Identifica la intención del usuario desde su mensaje
   */
  private identifyIntent(userMessage: string, context: ConversationContext): IntentAnalysis {
    const messageLower = userMessage.toLowerCase();

    // Detectar saludo
    if (
      messageLower.match(/\b(hola|buenos días|buenas tardes|buenas noches|hey|saludos)\b/) &&
      context.conversationHistory.length === 0
    ) {
      return {
        intent: IntentType.GREETING,
        confidence: 0.9,
        entities: {},
      };
    }

    // Detectar solicitud de certificado
    if (
      messageLower.match(/\b(certificado|constancia|documento|certificación|comprobante)\b/) &&
      (messageLower.includes('necesito') ||
        messageLower.includes('solicitar') ||
        messageLower.includes('quiero') ||
        messageLower.includes('generar'))
    ) {
      // Extraer tipo de certificado
      let certificateType = 'enrollment'; // default

      if (messageLower.includes('calificacion') || messageLower.includes('notas')) {
        certificateType = 'grades';
      } else if (messageLower.includes('graduacion') || messageLower.includes('graduado')) {
        certificateType = 'graduation';
      }

      return {
        intent: IntentType.REQUEST_CERTIFICATE,
        confidence: 0.85,
        entities: { certificateType },
      };
    }

    // Detectar consulta sobre programa
    if (
      messageLower.match(/\b(programa|carrera|pensum|requisitos|inscripción|admisión)\b/) &&
      (messageLower.includes('cuál') ||
        messageLower.includes('qué') ||
        messageLower.includes('cómo') ||
        messageLower.includes('información'))
    ) {
      return {
        intent: IntentType.QUERY_PROGRAM,
        confidence: 0.8,
        entities: { query: userMessage },
      };
    }

    // Detectar consulta de estado académico
    if (
      messageLower.match(/\b(calificaciones|notas|promedio|gpa|estado académico|materias)\b/) &&
      (messageLower.includes('mi') ||
        messageLower.includes('cómo') ||
        messageLower.includes('ver') ||
        messageLower.includes('consultar'))
    ) {
      return {
        intent: IntentType.CHECK_ACADEMIC_STATUS,
        confidence: 0.85,
        entities: {},
      };
    }

    // Detectar solicitud de ayuda
    if (
      messageLower.match(/\b(ayuda|ayudar|puedes|necesito|apoyo|asistencia)\b/) ||
      messageLower.includes('?')
    ) {
      return {
        intent: IntentType.REQUEST_HELP,
        confidence: 0.7,
        entities: {},
      };
    }

    // Intención desconocida
    return {
      intent: IntentType.UNKNOWN,
      confidence: 0.5,
      entities: {},
    };
  }

  /**
   * Analiza la situación del estudiante
   */
  private async analyzeSituation(
    context: ConversationContext,
    intentAnalysis: IntentAnalysis,
  ): Promise<any> {
    const analysis: any = {
      hasProfile: !!context.studentProfile,
      needsAcademicCheck: false,
      academicAnalysis: null,
      impediments: null,
    };

    // Si la intención requiere verificar estado académico
    if (
      intentAnalysis.intent === IntentType.REQUEST_CERTIFICATE ||
      intentAnalysis.intent === IntentType.CHECK_ACADEMIC_STATUS
    ) {
      analysis.needsAcademicCheck = true;

      if (context.studentId) {
        try {
          const academicRecord = await checkAcademicRecordMock({
            studentId: context.studentId,
            includeCourses: true,
            includeGrades: true,
          });

          analysis.academicAnalysis = analyzeAcademicRecord(academicRecord);
          analysis.impediments = analyzeImpediments(academicRecord);
        } catch (error) {
          logger.warn('No se pudo obtener historial académico:', error);
        }
      }
    }

    return analysis;
  }

  /**
   * Ejecuta las acciones necesarias según la intención
   */
  private async executeActions(
    intentAnalysis: IntentAnalysis,
    context: ConversationContext,
    situationAnalysis: any,
  ): Promise<any> {
    const result: any = {
      intent: intentAnalysis.intent,
      success: true,
      data: null,
      toolsUsed: [],
    };

    switch (intentAnalysis.intent) {
      case IntentType.GREETING:
        // No requiere acciones adicionales
        result.toolsUsed.push('greeting-generator');
        break;

      case IntentType.REQUEST_CERTIFICATE:
        if (!context.studentId) {
          result.success = false;
          result.error = 'missing_student_id';
          break;
        }

        result.toolsUsed.push('certificate-orchestrator');
        result.data = await orchestrateCertificateGeneration(
          {
            studentId: context.studentId,
            certificateType: intentAnalysis.entities.certificateType || 'enrollment',
            deliveryMethod: 'email',
          },
          this.useMock,
        );
        break;

      case IntentType.QUERY_PROGRAM:
        result.toolsUsed.push('query-knowledge-base');
        result.data = await queryKnowledgeBaseMock({
          query: intentAnalysis.entities.query || '',
          maxResults: 3,
        });
        break;

      case IntentType.CHECK_ACADEMIC_STATUS:
        if (!context.studentId) {
          result.success = false;
          result.error = 'missing_student_id';
          break;
        }

        result.toolsUsed.push('check-academic-record', 'academic-advisor');
        result.data = situationAnalysis.academicAnalysis;
        break;

      case IntentType.REQUEST_HELP:
      case IntentType.UNKNOWN:
        // Ofrecer ayuda general
        result.toolsUsed.push('help-generator');
        break;
    }

    return result;
  }

  /**
   * Genera la respuesta final para el usuario
   */
  private generateResponse(
    actionResult: any,
    context: ConversationContext,
    intentAnalysis: IntentAnalysis,
  ): AgentResponse {
    let message = '';
    let requiresHumanEscalation = false;

    switch (intentAnalysis.intent) {
      case IntentType.GREETING:
        if (context.studentProfile) {
          message = generateTimeBasedGreeting(context.studentProfile);
        } else {
          message = generateGreeting(undefined);
        }
        break;

      case IntentType.REQUEST_CERTIFICATE:
        if (actionResult.success && actionResult.data) {
          message = actionResult.data.message;
        } else if (actionResult.error === 'missing_student_id') {
          message =
            'Para generar tu certificado, necesito que me proporciones tu número de identificación de estudiante.';
        } else {
          message =
            'Lo siento, tuve un problema al procesar tu solicitud de certificado. ¿Podrías intentar de nuevo?';
          requiresHumanEscalation = true;
        }
        break;

      case IntentType.QUERY_PROGRAM:
        if (actionResult.data && actionResult.data.results.length > 0) {
          message = 'Encontré la siguiente información:\n\n';
          actionResult.data.results.forEach((result: any, index: number) => {
            message += `${index + 1}. **${result.title}**\n${result.excerpt}\n\n`;
          });
          message += '¿Necesitas más información sobre alguno de estos temas?';
        } else {
          message =
            'No encontré información específica sobre tu consulta. ¿Podrías reformular tu pregunta o contactar con la oficina de admisiones?';
        }
        break;

      case IntentType.CHECK_ACADEMIC_STATUS:
        if (actionResult.success && actionResult.data) {
          const profile = context.studentProfile;
          message = `Hola ${profile?.firstName}. `;

          if (actionResult.data.hasIssues) {
            message += generateProactiveMessage(actionResult.data);
          } else {
            message += `Tu rendimiento académico está excelente. Tienes un promedio de ${actionResult.data.gpaValue.toFixed(2)} y has completado ${actionResult.data.failedCourses.length === 0 ? 'todas tus materias' : 'la mayoría de tus materias'} exitosamente. ¡Sigue así!`;
          }
        } else if (actionResult.error === 'missing_student_id') {
          message =
            'Para consultar tu estado académico, necesito que me proporciones tu número de identificación de estudiante.';
        } else {
          message =
            'Lo siento, no pude acceder a tu información académica en este momento. Por favor, intenta más tarde.';
        }
        break;

      case IntentType.REQUEST_HELP:
        message = this.generateHelpMessage(context);
        break;

      case IntentType.UNKNOWN:
        message =
          'No estoy seguro de entender tu solicitud. Puedo ayudarte con:\n\n' +
          '- Generar certificados académicos\n' +
          '- Consultar información sobre programas\n' +
          '- Revisar tu estado académico\n' +
          '- Responder preguntas sobre admisiones\n\n' +
          '¿Con cuál de estos temas te gustaría ayuda?';
        break;
    }

    return {
      message,
      requiresHumanEscalation,
      metadata: {
        toolsUsed: actionResult.toolsUsed || [],
        processingTime: 0, // Se actualizará después
      },
    };
  }

  /**
   * Genera mensaje de ayuda general
   */
  private generateHelpMessage(context: ConversationContext): string {
    const profile = context.studentProfile;
    const greeting = profile ? `Hola ${profile.firstName}` : 'Hola';

    return (
      `${greeting}. Estoy aquí para ayudarte. Puedo asistirte con:\n\n` +
      '📄 **Certificados**: Puedo generar certificados de inscripción, calificaciones o graduación\n' +
      '📚 **Información Académica**: Consulta sobre programas, requisitos y fechas de inscripción\n' +
      '📊 **Estado Académico**: Revisa tus calificaciones y recibe recomendaciones personalizadas\n' +
      '❓ **Preguntas Generales**: Respondo dudas sobre trámites y procedimientos\n\n' +
      '¿En qué puedo ayudarte hoy?'
    );
  }

  /**
   * Actualiza el historial de conversación
   */
  private updateConversationHistory(
    context: ConversationContext,
    userMessage: string,
    assistantMessage: string,
  ): void {
    const timestamp = new Date().toISOString();

    context.conversationHistory.push({
      role: 'user',
      content: userMessage,
      timestamp,
    });

    context.conversationHistory.push({
      role: 'assistant',
      content: assistantMessage,
      timestamp,
    });

    // Limitar historial a últimos 20 mensajes
    if (context.conversationHistory.length > 20) {
      context.conversationHistory = context.conversationHistory.slice(-20);
    }
  }
}
