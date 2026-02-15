/**
 * Gestor de Estado de Conversación
 * Mantiene y persiste el contexto de conversación entre turnos
 */

import { ConversationContext } from '../types/models';
import { logger } from '../utils/logger';

/**
 * Almacenamiento en memoria para contextos de conversación
 * En producción, esto debería usar DynamoDB o similar
 */
const conversationStore = new Map<string, ConversationContext>();

/**
 * Tiempo de expiración de sesiones (30 minutos)
 */
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

/**
 * Gestor de estado de conversación
 */
export class ConversationManager {
  /**
   * Obtiene el contexto de conversación para una sesión
   * Si no existe, retorna undefined
   */
  static getContext(sessionId: string): ConversationContext | undefined {
    const context = conversationStore.get(sessionId);

    if (!context) {
      logger.info(`No se encontró contexto para sesión: ${sessionId}`);
      return undefined;
    }

    // Verificar si la sesión ha expirado
    const lastActivity = new Date(context.metadata.lastActivity || 0).getTime();
    const now = Date.now();

    if (now - lastActivity > SESSION_TIMEOUT_MS) {
      logger.info(`Sesión expirada: ${sessionId}`);
      this.clearContext(sessionId);
      return undefined;
    }

    logger.info(`Contexto recuperado para sesión: ${sessionId}`);
    return context;
  }

  /**
   * Guarda o actualiza el contexto de conversación
   */
  static saveContext(context: ConversationContext): void {
    // Actualizar timestamp de última actividad
    context.metadata.lastActivity = new Date().toISOString();

    conversationStore.set(context.sessionId, context);
    logger.info(`Contexto guardado para sesión: ${context.sessionId}`);
  }

  /**
   * Actualiza el contexto de conversación
   */
  static updateContext(
    sessionId: string,
    updates: Partial<ConversationContext>,
  ): ConversationContext | undefined {
    const context = this.getContext(sessionId);

    if (!context) {
      logger.warn(`No se puede actualizar contexto inexistente: ${sessionId}`);
      return undefined;
    }

    // Aplicar actualizaciones
    const updatedContext = {
      ...context,
      ...updates,
      metadata: {
        ...context.metadata,
        ...updates.metadata,
        lastActivity: new Date().toISOString(),
      },
    };

    this.saveContext(updatedContext);
    logger.info(`Contexto actualizado para sesión: ${sessionId}`);

    return updatedContext;
  }

  /**
   * Limpia el contexto de una sesión
   */
  static clearContext(sessionId: string): void {
    conversationStore.delete(sessionId);
    logger.info(`Contexto eliminado para sesión: ${sessionId}`);
  }

  /**
   * Limpia todas las sesiones expiradas
   */
  static cleanupExpiredSessions(): number {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [sessionId, context] of conversationStore.entries()) {
      const lastActivity = new Date(context.metadata.lastActivity || 0).getTime();

      if (now - lastActivity > SESSION_TIMEOUT_MS) {
        conversationStore.delete(sessionId);
        cleanedCount++;
        logger.info(`Sesión expirada limpiada: ${sessionId}`);
      }
    }

    if (cleanedCount > 0) {
      logger.info(`Limpiadas ${cleanedCount} sesiones expiradas`);
    }

    return cleanedCount;
  }

  /**
   * Obtiene el número de sesiones activas
   */
  static getActiveSessionCount(): number {
    return conversationStore.size;
  }

  /**
   * Verifica si una sesión existe y está activa
   */
  static hasActiveSession(sessionId: string): boolean {
    const context = this.getContext(sessionId);
    return context !== undefined;
  }

  /**
   * Crea un nuevo contexto de conversación
   */
  static createContext(sessionId: string, studentId?: string): ConversationContext {
    const context: ConversationContext = {
      sessionId,
      studentId,
      conversationHistory: [],
      entities: new Map(),
      metadata: {
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
      },
    };

    this.saveContext(context);
    logger.info(`Nuevo contexto creado para sesión: ${sessionId}`);

    return context;
  }

  /**
   * Obtiene o crea un contexto de conversación
   */
  static getOrCreateContext(sessionId: string, studentId?: string): ConversationContext {
    let context = this.getContext(sessionId);

    if (!context) {
      context = this.createContext(sessionId, studentId);
    } else if (studentId && !context.studentId) {
      // Actualizar studentId si no estaba presente
      context = this.updateContext(sessionId, { studentId }) || context;
    }

    return context;
  }

  /**
   * Agrega metadata personalizada al contexto
   */
  static addMetadata(sessionId: string, key: string, value: unknown): void {
    const context = this.getContext(sessionId);

    if (!context) {
      logger.warn(`No se puede agregar metadata a sesión inexistente: ${sessionId}`);
      return;
    }

    context.metadata[key] = value;
    this.saveContext(context);
    logger.info(`Metadata agregada a sesión ${sessionId}: ${key}`);
  }

  /**
   * Obtiene estadísticas del gestor de conversaciones
   */
  static getStats(): {
    activeSessions: number;
    totalSessions: number;
    oldestSession: string | null;
  } {
    let oldestTimestamp = Date.now();
    let oldestSessionId: string | null = null;

    for (const [sessionId, context] of conversationStore.entries()) {
      const lastActivity = new Date(context.metadata.lastActivity || 0).getTime();

      if (lastActivity < oldestTimestamp) {
        oldestTimestamp = lastActivity;
        oldestSessionId = sessionId;
      }
    }

    return {
      activeSessions: conversationStore.size,
      totalSessions: conversationStore.size,
      oldestSession: oldestSessionId,
    };
  }
}
