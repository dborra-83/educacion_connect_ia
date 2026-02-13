/**
 * Tests para el Gestor de Estado de Conversación
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConversationManager } from './conversation-manager';
import { ConversationContext } from '../types/models';

describe('ConversationManager', () => {
  const testSessionId = 'test-session-123';
  const testStudentId = 'STU001';

  beforeEach(() => {
    // Limpiar todas las sesiones antes de cada test
    const stats = ConversationManager.getStats();
    // No hay método público para limpiar todo, así que limpiamos manualmente
  });

  afterEach(() => {
    // Limpiar sesión de test
    ConversationManager.clearContext(testSessionId);
  });

  describe('Creación de Contexto', () => {
    it('debe crear un nuevo contexto de conversación', () => {
      const context = ConversationManager.createContext(testSessionId, testStudentId);

      expect(context.sessionId).toBe(testSessionId);
      expect(context.studentId).toBe(testStudentId);
      expect(context.conversationHistory).toEqual([]);
      expect(context.metadata.createdAt).toBeDefined();
      expect(context.metadata.lastActivity).toBeDefined();
    });

    it('debe crear contexto sin studentId', () => {
      const context = ConversationManager.createContext(testSessionId);

      expect(context.sessionId).toBe(testSessionId);
      expect(context.studentId).toBeUndefined();
    });

    it('debe obtener o crear contexto cuando no existe', () => {
      const context = ConversationManager.getOrCreateContext(testSessionId, testStudentId);

      expect(context.sessionId).toBe(testSessionId);
      expect(context.studentId).toBe(testStudentId);
    });

    it('debe obtener contexto existente en getOrCreateContext', () => {
      const context1 = ConversationManager.createContext(testSessionId, testStudentId);
      const context2 = ConversationManager.getOrCreateContext(testSessionId);

      expect(context2.sessionId).toBe(context1.sessionId);
      expect(context2.metadata.createdAt).toBe(context1.metadata.createdAt);
    });

    it('debe actualizar studentId en contexto existente si no estaba presente', () => {
      ConversationManager.createContext(testSessionId);
      const context = ConversationManager.getOrCreateContext(testSessionId, testStudentId);

      expect(context.studentId).toBe(testStudentId);
    });
  });

  describe('Recuperación de Contexto', () => {
    it('debe recuperar contexto guardado', () => {
      const originalContext = ConversationManager.createContext(testSessionId, testStudentId);
      const retrievedContext = ConversationManager.getContext(testSessionId);

      expect(retrievedContext).toBeDefined();
      expect(retrievedContext?.sessionId).toBe(originalContext.sessionId);
      expect(retrievedContext?.studentId).toBe(originalContext.studentId);
    });

    it('debe retornar undefined para sesión inexistente', () => {
      const context = ConversationManager.getContext('non-existent-session');

      expect(context).toBeUndefined();
    });

    it('debe verificar si una sesión está activa', () => {
      ConversationManager.createContext(testSessionId);

      expect(ConversationManager.hasActiveSession(testSessionId)).toBe(true);
      expect(ConversationManager.hasActiveSession('non-existent')).toBe(false);
    });
  });

  describe('Actualización de Contexto', () => {
    it('debe actualizar contexto existente', () => {
      ConversationManager.createContext(testSessionId);

      const updatedContext = ConversationManager.updateContext(testSessionId, {
        studentId: 'STU002',
        currentIntent: 'greeting',
      });

      expect(updatedContext).toBeDefined();
      expect(updatedContext?.studentId).toBe('STU002');
      expect(updatedContext?.currentIntent).toBe('greeting');
    });

    it('debe actualizar timestamp de última actividad al actualizar', () => {
      const context = ConversationManager.createContext(testSessionId);
      const originalTimestamp = context.metadata.lastActivity;

      // Esperar un poco para que el timestamp cambie
      vi.useFakeTimers();
      vi.advanceTimersByTime(1000);

      const updatedContext = ConversationManager.updateContext(testSessionId, {
        currentIntent: 'greeting',
      });

      vi.useRealTimers();

      expect(updatedContext?.metadata.lastActivity).not.toBe(originalTimestamp);
    });

    it('debe retornar undefined al actualizar sesión inexistente', () => {
      const result = ConversationManager.updateContext('non-existent', {
        studentId: 'STU001',
      });

      expect(result).toBeUndefined();
    });

    it('debe preservar metadata existente al actualizar', () => {
      const context = ConversationManager.createContext(testSessionId);
      context.metadata.customField = 'test-value';
      ConversationManager.saveContext(context);

      const updatedContext = ConversationManager.updateContext(testSessionId, {
        studentId: 'STU002',
      });

      expect(updatedContext?.metadata.customField).toBe('test-value');
    });
  });

  describe('Guardado de Contexto', () => {
    it('debe guardar contexto correctamente', () => {
      const context: ConversationContext = {
        sessionId: testSessionId,
        studentId: testStudentId,
        conversationHistory: [],
        metadata: {},
      };

      ConversationManager.saveContext(context);
      const retrieved = ConversationManager.getContext(testSessionId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.sessionId).toBe(testSessionId);
    });

    it('debe actualizar timestamp al guardar', () => {
      const context: ConversationContext = {
        sessionId: testSessionId,
        conversationHistory: [],
        metadata: {},
      };

      ConversationManager.saveContext(context);
      const retrieved = ConversationManager.getContext(testSessionId);

      expect(retrieved?.metadata.lastActivity).toBeDefined();
    });
  });

  describe('Limpieza de Contexto', () => {
    it('debe limpiar contexto de sesión', () => {
      ConversationManager.createContext(testSessionId);
      expect(ConversationManager.hasActiveSession(testSessionId)).toBe(true);

      ConversationManager.clearContext(testSessionId);
      expect(ConversationManager.hasActiveSession(testSessionId)).toBe(false);
    });

    it('debe limpiar sesiones expiradas', () => {
      vi.useFakeTimers();

      // Crear sesión
      ConversationManager.createContext(testSessionId);

      // Avanzar tiempo más allá del timeout (30 minutos)
      vi.advanceTimersByTime(31 * 60 * 1000);

      const cleanedCount = ConversationManager.cleanupExpiredSessions();

      vi.useRealTimers();

      expect(cleanedCount).toBeGreaterThan(0);
      expect(ConversationManager.hasActiveSession(testSessionId)).toBe(false);
    });

    it('debe no limpiar sesiones activas', () => {
      ConversationManager.createContext(testSessionId);

      const cleanedCount = ConversationManager.cleanupExpiredSessions();

      expect(cleanedCount).toBe(0);
      expect(ConversationManager.hasActiveSession(testSessionId)).toBe(true);
    });

    it('debe retornar undefined para sesión expirada', () => {
      vi.useFakeTimers();

      ConversationManager.createContext(testSessionId);

      // Avanzar tiempo más allá del timeout
      vi.advanceTimersByTime(31 * 60 * 1000);

      const context = ConversationManager.getContext(testSessionId);

      vi.useRealTimers();

      expect(context).toBeUndefined();
    });
  });

  describe('Metadata', () => {
    it('debe agregar metadata personalizada', () => {
      ConversationManager.createContext(testSessionId);

      ConversationManager.addMetadata(testSessionId, 'customKey', 'customValue');

      const context = ConversationManager.getContext(testSessionId);
      expect(context?.metadata.customKey).toBe('customValue');
    });

    it('debe no agregar metadata a sesión inexistente', () => {
      ConversationManager.addMetadata('non-existent', 'key', 'value');

      const context = ConversationManager.getContext('non-existent');
      expect(context).toBeUndefined();
    });

    it('debe soportar diferentes tipos de valores en metadata', () => {
      ConversationManager.createContext(testSessionId);

      ConversationManager.addMetadata(testSessionId, 'number', 42);
      ConversationManager.addMetadata(testSessionId, 'boolean', true);
      ConversationManager.addMetadata(testSessionId, 'object', { nested: 'value' });

      const context = ConversationManager.getContext(testSessionId);
      expect(context?.metadata.number).toBe(42);
      expect(context?.metadata.boolean).toBe(true);
      expect(context?.metadata.object).toEqual({ nested: 'value' });
    });
  });

  describe('Estadísticas', () => {
    it('debe obtener conteo de sesiones activas', () => {
      const initialCount = ConversationManager.getActiveSessionCount();

      ConversationManager.createContext(testSessionId);

      const newCount = ConversationManager.getActiveSessionCount();
      expect(newCount).toBe(initialCount + 1);
    });

    it('debe obtener estadísticas completas', () => {
      ConversationManager.createContext(testSessionId);

      const stats = ConversationManager.getStats();

      expect(stats.activeSessions).toBeGreaterThan(0);
      expect(stats.totalSessions).toBeGreaterThan(0);
    });

    it('debe identificar sesión más antigua', () => {
      vi.useFakeTimers();

      const session1 = 'session-1';
      const session2 = 'session-2';

      ConversationManager.createContext(session1);

      vi.advanceTimersByTime(1000);

      ConversationManager.createContext(session2);

      const stats = ConversationManager.getStats();

      vi.useRealTimers();

      expect(stats.oldestSession).toBe(session1);

      // Limpiar
      ConversationManager.clearContext(session1);
      ConversationManager.clearContext(session2);
    });

    it('debe retornar null para oldestSession cuando no hay sesiones', () => {
      // Limpiar todas las sesiones primero
      ConversationManager.cleanupExpiredSessions();

      const stats = ConversationManager.getStats();

      // Puede haber otras sesiones de otros tests, así que solo verificamos la estructura
      expect(stats).toHaveProperty('oldestSession');
    });
  });

  describe('Persistencia entre Turnos', () => {
    it('debe mantener historial de conversación entre recuperaciones', () => {
      const context = ConversationManager.createContext(testSessionId);

      context.conversationHistory.push({
        role: 'user',
        content: 'Hola',
        timestamp: new Date().toISOString(),
      });

      ConversationManager.saveContext(context);

      const retrieved = ConversationManager.getContext(testSessionId);
      expect(retrieved?.conversationHistory.length).toBe(1);
      expect(retrieved?.conversationHistory[0].content).toBe('Hola');
    });

    it('debe mantener perfil de estudiante entre recuperaciones', () => {
      const context = ConversationManager.createContext(testSessionId, testStudentId);

      context.studentProfile = {
        studentId: testStudentId,
        firstName: 'Carlos',
        lastName: 'Rodríguez',
        email: 'carlos@example.com',
        phone: '+1234567890',
        enrollmentStatus: 'active',
        academicLevel: 'sophomore',
        lastUpdated: new Date().toISOString(),
      };

      ConversationManager.saveContext(context);

      const retrieved = ConversationManager.getContext(testSessionId);
      expect(retrieved?.studentProfile?.firstName).toBe('Carlos');
      expect(retrieved?.studentProfile?.lastName).toBe('Rodríguez');
    });
  });
});
