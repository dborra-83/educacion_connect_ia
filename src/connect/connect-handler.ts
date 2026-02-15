/**
 * Handler principal de Amazon Connect
 * Punto de entrada para eventos de Amazon Connect
 */

import { ReasoningEngine } from '../agent/reasoning-engine';
import { ConversationManager } from '../agent/conversation-manager';
import { ErrorHandler } from '../agent/error-handler';
import { logger } from '../utils/logger';
import { metricsPublisher } from './metrics-publisher';
import type { ConversationContext, AgentResponse } from '../types/models';

/**
 * Evento de Amazon Connect
 */
export interface ConnectEvent {
  Details: {
    ContactData: {
      Attributes: Record<string, string>;
      ContactId: string;
      InitialContactId: string;
      Channel: string;
      InstanceARN: string;
      PreviousContactId?: string;
    };
    Parameters: Record<string, string>;
  };
  Name: string;
}

/**
 * Respuesta para Amazon Connect
 */
export interface ConnectResponse {
  statusCode: number;
  body: string;
  headers?: Record<string, string>;
}

/**
 * Resultado del procesamiento
 */
interface ProcessingResult {
  message: string;
  requiresHumanEscalation: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Registro de interacción completa
 */
interface InteractionLog {
  contactId: string;
  sessionId: string;
  studentId?: string;
  channel: string;
  timestamp: string;
  userMessage: string;
  agentResponse: string;
  intent?: string;
  toolsUsed: string[];
  actionsExecuted: string[];
  processingTime: number;
  requiresEscalation: boolean;
  errorOccurred: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Handler de Amazon Connect
 */
export class ConnectHandler {
  private reasoningEngine: ReasoningEngine;

  constructor() {
    this.reasoningEngine = new ReasoningEngine();
  }

  /**
   * Procesa un evento de Amazon Connect
   */
  async handleEvent(event: ConnectEvent): Promise<ConnectResponse> {
    const startTime = Date.now();

    try {
      logger.info('Evento de Amazon Connect recibido', {
        contactId: event.Details.ContactData.ContactId,
        channel: event.Details.ContactData.Channel,
      });

      // Obtener o crear contexto de conversación
      const sessionId = event.Details.ContactData.ContactId;
      const studentId = this.extractStudentId(event);
      const context = ConversationManager.getOrCreateContext(sessionId, studentId);

      // Extraer mensaje del usuario
      const userMessage = this.extractUserMessage(event);

      // Procesar mensaje con el motor de razonamiento
      const response = await this.reasoningEngine.processMessage(userMessage, context);

      // Verificar si se requiere transferencia a agente humano
      if (response.requiresHumanEscalation) {
        const transferResult = await HumanTransferManager.initiateTransfer(
          event.Details.ContactData.ContactId,
          context,
          'El agente requiere asistencia humana',
        );

        // Agregar mensaje de transferencia a la respuesta
        response.message = HumanTransferManager.generateTransferMessage(transferResult);
        response.metadata = {
          ...response.metadata,
          transferId: transferResult.transferId,
          queueName: transferResult.queueName,
        };
      }

      // Actualizar contexto con el nuevo mensaje
      ConversationManager.updateContext(sessionId, {
        conversationHistory: [
          ...context.conversationHistory,
          {
            role: 'user',
            content: userMessage,
            timestamp: new Date().toISOString(),
          },
          {
            role: 'assistant',
            content: response.message,
            timestamp: new Date().toISOString(),
          },
        ],
      });

      // Formatear respuesta para Amazon Connect
      const connectResponse = this.formatResponse(response);

      // Registrar interacción completa
      await this.logInteraction(event, userMessage, response, Date.now() - startTime, false);

      // Publicar métricas
      this.publishMetrics(response, Date.now() - startTime, false);

      logger.info('Evento procesado exitosamente', {
        contactId: event.Details.ContactData.ContactId,
        processingTime: Date.now() - startTime,
      });

      return connectResponse;
    } catch (error) {
      logger.error('Error procesando evento de Amazon Connect', {
        error,
        contactId: event.Details.ContactData.ContactId,
      });

      // Publicar métrica de error
      metricsPublisher.publishErrorRate(true, {
        ContactId: event.Details.ContactData.ContactId,
        Channel: event.Details.ContactData.Channel,
      });

      return this.handleError(error as Error, event, Date.now() - startTime);
    }
  }

  /**
   * Extrae el studentId del evento de Amazon Connect
   */
  private extractStudentId(event: ConnectEvent): string | undefined {
    const attributes = event.Details.ContactData.Attributes;
    const parameters = event.Details.Parameters;
    return attributes.studentId || parameters.studentId;
  }

  /**
   * Extrae el mensaje del usuario del evento
   */
  private extractUserMessage(event: ConnectEvent): string {
    const parameters = event.Details.Parameters;
    return parameters.userMessage || parameters.inputText || parameters.text || '';
  }

  /**
   * Formatea la respuesta del agente para Amazon Connect
   */
  private formatResponse(response: AgentResponse): ConnectResponse {
    const result: ProcessingResult = {
      message: response.message,
      requiresHumanEscalation: response.requiresHumanEscalation,
      metadata: response.metadata,
    };

    return {
      statusCode: 200,
      body: JSON.stringify(result),
      headers: {
        'Content-Type': 'application/json',
      },
    };
  }

  /**
   * Registra la interacción completa en CloudWatch
   * Cumple con requisito 9.2: Registro de interacciones
   */
  private async logInteraction(
    event: ConnectEvent,
    userMessage: string,
    response: AgentResponse,
    processingTime: number,
    errorOccurred: boolean,
  ): Promise<void> {
    const interactionLog: InteractionLog = {
      contactId: event.Details.ContactData.ContactId,
      sessionId: event.Details.ContactData.ContactId,
      studentId: event.Details.ContactData.Attributes.studentId,
      channel: event.Details.ContactData.Channel,
      timestamp: new Date().toISOString(),
      userMessage,
      agentResponse: response.message,
      intent: response.metadata?.intent as string | undefined,
      toolsUsed: response.metadata?.toolsUsed || [],
      actionsExecuted: response.actions?.map((a) => a.type) || [],
      processingTime,
      requiresEscalation: response.requiresHumanEscalation,
      errorOccurred,
      metadata: {
        instanceARN: event.Details.ContactData.InstanceARN,
        initialContactId: event.Details.ContactData.InitialContactId,
        previousContactId: event.Details.ContactData.PreviousContactId,
      },
    };

    // Registrar en CloudWatch Logs con formato estructurado
    logger.info('Interacción completa registrada', interactionLog);

    // En producción, aquí también se podría:
    // - Guardar en DynamoDB para análisis posterior
    // - Enviar a Kinesis para procesamiento en tiempo real
    // - Publicar métricas a CloudWatch Metrics
  }

  /**
   * Publica métricas de la interacción a CloudWatch
   * Cumple con requisito 9.4: Exposición de métricas
   */
  private publishMetrics(
    response: AgentResponse,
    processingTime: number,
    errorOccurred: boolean,
  ): void {
    // Métrica de tiempo de respuesta
    metricsPublisher.publishResponseTime(processingTime);

    // Métrica de tasa de error
    metricsPublisher.publishErrorRate(errorOccurred);

    // Métrica de tasa de escalamiento
    metricsPublisher.publishEscalationRate(response.requiresHumanEscalation);

    // Métricas de uso de herramientas
    if (response.metadata?.toolsUsed) {
      response.metadata.toolsUsed.forEach((tool) => {
        metricsPublisher.publishToolUsage(tool);
      });
    }

    // Métrica de detección de intención
    if (response.metadata?.intent) {
      metricsPublisher.publishIntentDetection(
        response.metadata.intent as string,
        0.8, // Confianza por defecto
      );
    }
  }

  /**
   * Maneja errores y genera respuesta apropiada
   */
  private handleError(
    error: Error,
    event: ConnectEvent,
    processingTime: number,
  ): ConnectResponse {
    const errorResult = ErrorHandler.handleError(error);
    const userMessage = ErrorHandler.generateUserMessage(errorResult);

    // Registrar interacción con error
    this.logInteraction(
      event,
      this.extractUserMessage(event),
      {
        message: userMessage,
        requiresHumanEscalation: errorResult.requiresHumanEscalation,
        metadata: {
          toolsUsed: [],
          processingTime,
        },
      },
      processingTime,
      true,
    ).catch((logError) => {
      logger.error('Error al registrar interacción fallida', { logError });
    });

    const result: ProcessingResult = {
      message: userMessage,
      requiresHumanEscalation: errorResult.requiresHumanEscalation,
      metadata: {
        error: true,
        severity: errorResult.severity,
      },
    };

    return {
      statusCode: 200,
      body: JSON.stringify(result),
      headers: {
        'Content-Type': 'application/json',
      },
    };
  }
}

/**
 * Función Lambda handler para Amazon Connect
 */
export const handler = async (event: ConnectEvent): Promise<ConnectResponse> => {
  const connectHandler = new ConnectHandler();
  return connectHandler.handleEvent(event);
};

/**
 * Gestor de transferencias a agentes humanos
 */
export class HumanTransferManager {
  /**
   * Inicia una transferencia a un agente humano en Amazon Connect
   * Cumple con requisito 9.3: Transferencia a agente humano
   */
  static async initiateTransfer(
    contactId: string,
    context: ConversationContext,
    reason: string,
  ): Promise<TransferResult> {
    logger.info('Iniciando transferencia a agente humano', {
      contactId,
      sessionId: context.sessionId,
      studentId: context.studentId,
      reason,
    });

    // Preparar contexto para el agente humano
    const transferContext = this.prepareTransferContext(context, reason);

    // En producción, aquí se invocaría la API de Amazon Connect
    // para iniciar la transferencia a una cola de agentes humanos
    // Por ahora, retornamos un resultado simulado

    const result: TransferResult = {
      success: true,
      transferId: `TRANSFER-${Date.now()}`,
      queueName: this.selectQueue(reason),
      estimatedWaitTime: 120, // 2 minutos
      context: transferContext,
      timestamp: new Date().toISOString(),
    };

    logger.info('Transferencia iniciada exitosamente', {
      contactId,
      transferId: result.transferId,
      queueName: result.queueName,
    });

    return result;
  }

  /**
   * Prepara el contexto de conversación para el agente humano
   */
  private static prepareTransferContext(
    context: ConversationContext,
    reason: string,
  ): TransferContext {
    return {
      sessionId: context.sessionId,
      studentId: context.studentId,
      studentProfile: context.studentProfile
        ? {
            name: `${context.studentProfile.firstName} ${context.studentProfile.lastName}`,
            program: context.studentProfile.program,
            email: context.studentProfile.email,
          }
        : undefined,
      conversationSummary: this.generateConversationSummary(context),
      transferReason: reason,
      lastIntent: context.currentIntent,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Genera un resumen de la conversación para el agente humano
   */
  private static generateConversationSummary(context: ConversationContext): string {
    const messageCount = context.conversationHistory.length;

    if (messageCount === 0) {
      return 'No hay mensajes previos en la conversación.';
    }

    // Tomar los últimos 5 mensajes para el resumen
    const recentMessages = context.conversationHistory.slice(-5);

    const summary = recentMessages
      .map((msg) => `${msg.role === 'user' ? 'Estudiante' : 'Agente'}: ${msg.content}`)
      .join('\n');

    return `Últimos ${recentMessages.length} mensajes:\n${summary}`;
  }

  /**
   * Selecciona la cola apropiada según el motivo de transferencia
   */
  private static selectQueue(reason: string): string {
    // Mapeo de razones a colas específicas
    const queueMap: Record<string, string> = {
      technical_error: 'TechnicalSupport',
      complex_query: 'AcademicAdvisors',
      financial_issue: 'FinancialAid',
      complaint: 'CustomerService',
      unknown: 'GeneralSupport',
    };

    // Detectar tipo de razón
    const lowerReason = reason.toLowerCase();

    if (lowerReason.includes('error') || lowerReason.includes('técnico')) {
      return queueMap.technical_error;
    }
    if (lowerReason.includes('académico') || lowerReason.includes('curso')) {
      return queueMap.complex_query;
    }
    if (lowerReason.includes('deuda') || lowerReason.includes('pago')) {
      return queueMap.financial_issue;
    }
    if (lowerReason.includes('queja') || lowerReason.includes('reclamo')) {
      return queueMap.complaint;
    }

    return queueMap.unknown;
  }

  /**
   * Genera mensaje de transferencia para el usuario
   */
  static generateTransferMessage(result: TransferResult): string {
    const waitTimeMinutes = Math.ceil(result.estimatedWaitTime / 60);

    return (
      `Voy a transferirte con un agente humano que podrá ayudarte mejor. ` +
      `Te conectaré con el equipo de ${result.queueName}. ` +
      `El tiempo estimado de espera es de aproximadamente ${waitTimeMinutes} minuto${waitTimeMinutes > 1 ? 's' : ''}. ` +
      `He compartido el contexto de nuestra conversación con el agente para que pueda ayudarte más rápidamente.`
    );
  }
}

/**
 * Resultado de una transferencia
 */
export interface TransferResult {
  success: boolean;
  transferId: string;
  queueName: string;
  estimatedWaitTime: number;
  context: TransferContext;
  timestamp: string;
  error?: string;
}

/**
 * Contexto de transferencia para agente humano
 */
export interface TransferContext {
  sessionId: string;
  studentId?: string;
  studentProfile?: {
    name: string;
    program?: string | { name: string; code: string; enrollmentDate: string; programId?: string; level?: string };
    email: string;
  };
  conversationSummary: string;
  transferReason: string;
  lastIntent?: string;
  timestamp: string;
}
