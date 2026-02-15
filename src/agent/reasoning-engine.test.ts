/**
 * Tests para el Motor de Razonamiento del Agente
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ReasoningEngine, IntentType } from './reasoning-engine';
import { ConversationContext } from '../types/models';

describe('ReasoningEngine', () => {
  let engine: ReasoningEngine;
  let context: ConversationContext;

  beforeEach(() => {
    engine = new ReasoningEngine(true); // usar mocks
    context = {
      sessionId: 'test-session-123',
      studentId: 'STU001',
      conversationHistory: [],
      metadata: {},
    };
  });

  describe('Detección de Intenciones', () => {
    it('debe detectar intención de saludo al inicio de conversación', async () => {
      const response = await engine.processMessage('Hola', context);

      expect(response.message).toBeTruthy();
      expect(response.message.length).toBeGreaterThan(0);
      expect(context.currentIntent).toBe(IntentType.GREETING);
    });

    it('debe detectar intención de solicitud de certificado', async () => {
      const response = await engine.processMessage(
        'Necesito un certificado de inscripción',
        context,
      );

      expect(context.currentIntent).toBe(IntentType.REQUEST_CERTIFICATE);
      expect(response.message).toBeTruthy();
    });

    it('debe detectar intención de consulta sobre programa', async () => {
      const response = await engine.processMessage(
        '¿Cuál es el pensum de Ingeniería Informática?',
        context,
      );

      expect(context.currentIntent).toBe(IntentType.QUERY_PROGRAM);
      expect(response.message).toBeTruthy();
    });

    it('debe detectar intención de consulta de estado académico', async () => {
      const response = await engine.processMessage('¿Cómo están mis calificaciones?', context);

      expect(context.currentIntent).toBe(IntentType.CHECK_ACADEMIC_STATUS);
      expect(response.message).toBeTruthy();
    });

    it('debe detectar intención de solicitud de ayuda', async () => {
      const response = await engine.processMessage('¿Puedes ayudarme?', context);

      expect(context.currentIntent).toBe(IntentType.REQUEST_HELP);
      expect(response.message).toContain('ayudarte');
    });

    it('debe detectar intención desconocida para mensajes ambiguos', async () => {
      const response = await engine.processMessage('xyz abc 123', context);

      expect(context.currentIntent).toBe(IntentType.UNKNOWN);
      expect(response.message).toContain('No estoy seguro');
    });
  });

  describe('Procesamiento de Mensajes', () => {
    it('debe generar saludo personalizado cuando hay perfil', async () => {
      context.studentProfile = {
        studentId: 'STU001',
        firstName: 'Carlos',
        lastName: 'Rodríguez',
        email: 'carlos@example.com',
        phone: '+1234567890',
        enrollmentStatus: 'active',
        program: {
          programId: 'PROG001',
          name: 'Ingeniería Informática',
          level: 'undergraduate',
          startDate: '2023-01-15',
        },
        academicLevel: 'sophomore',
        lastUpdated: new Date().toISOString(),
      };

      const response = await engine.processMessage('Hola', context);

      expect(response.message).toContain('Carlos');
      expect(response.message).toContain('Ingeniería Informática');
    });

    it('debe actualizar historial de conversación', async () => {
      const userMessage = 'Hola';
      await engine.processMessage(userMessage, context);

      expect(context.conversationHistory.length).toBe(2); // user + assistant
      expect(context.conversationHistory[0].role).toBe('user');
      expect(context.conversationHistory[0].content).toBe(userMessage);
      expect(context.conversationHistory[1].role).toBe('assistant');
    });

    it('debe incluir tiempo de procesamiento en metadata', async () => {
      const response = await engine.processMessage('Hola', context);

      expect(response.metadata?.processingTime).toBeGreaterThan(0);
    });

    it('debe incluir herramientas usadas en metadata', async () => {
      const response = await engine.processMessage('Hola', context);

      expect(response.metadata?.toolsUsed).toBeDefined();
      expect(Array.isArray(response.metadata?.toolsUsed)).toBe(true);
    });
  });

  describe('Flujo de Certificados', () => {
    it('debe procesar solicitud de certificado exitosamente', async () => {
      const response = await engine.processMessage(
        'Necesito un certificado de inscripción',
        context,
      );

      expect(response.message).toBeTruthy();
      expect(response.requiresHumanEscalation).toBeFalsy();
    });

    it('debe solicitar identificación si no hay studentId', async () => {
      context.studentId = undefined;

      const response = await engine.processMessage(
        'Necesito un certificado de inscripción',
        context,
      );

      expect(response.message).toContain('identificación');
    });

    it('debe detectar tipo de certificado de calificaciones', async () => {
      const response = await engine.processMessage(
        'Quiero solicitar un certificado de notas',
        context,
      );

      expect(response.message).toBeTruthy();
    });
  });

  describe('Consultas a Base de Conocimiento', () => {
    it('debe responder consultas sobre programas', async () => {
      const response = await engine.processMessage(
        '¿Cuáles son los requisitos de admisión?',
        context,
      );

      expect(response.message).toBeTruthy();
      expect(context.currentIntent).toBe(IntentType.QUERY_PROGRAM);
    });

    it('debe formatear resultados de búsqueda', async () => {
      const response = await engine.processMessage('¿Qué es el pensum?', context);

      expect(response.message).toBeTruthy();
    });
  });

  describe('Estado Académico', () => {
    it('debe consultar estado académico del estudiante', async () => {
      const response = await engine.processMessage('¿Cómo están mis calificaciones?', context);

      expect(response.message).toBeTruthy();
      expect(context.currentIntent).toBe(IntentType.CHECK_ACADEMIC_STATUS);
    });

    it('debe solicitar identificación si no hay studentId para estado académico', async () => {
      context.studentId = undefined;

      const response = await engine.processMessage('¿Cómo están mis calificaciones?', context);

      expect(response.message).toContain('identificación');
    });
  });

  describe('Manejo de Errores', () => {
    it('debe manejar errores gracefully', async () => {
      // Forzar error usando contexto inválido
      const invalidContext = {} as ConversationContext;

      const response = await engine.processMessage('Hola', invalidContext);

      expect(response.message).toContain('problema');
      expect(response.requiresHumanEscalation).toBe(true);
    });

    it('debe incluir tiempo de procesamiento incluso en errores', async () => {
      const invalidContext = {} as ConversationContext;

      const response = await engine.processMessage('Hola', invalidContext);

      expect(response.metadata?.processingTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Historial de Conversación', () => {
    it('debe limitar historial a 20 mensajes', async () => {
      // Agregar 25 mensajes
      for (let i = 0; i < 25; i++) {
        await engine.processMessage(`Mensaje ${i}`, context);
      }

      expect(context.conversationHistory.length).toBeLessThanOrEqual(20);
    });

    it('debe mantener mensajes más recientes cuando limita historial', async () => {
      // Agregar 25 mensajes
      for (let i = 0; i < 25; i++) {
        await engine.processMessage(`Mensaje ${i}`, context);
      }

      const lastUserMessage = context.conversationHistory.find(
        (msg) => msg.role === 'user' && msg.content.includes('Mensaje 24'),
      );

      expect(lastUserMessage).toBeDefined();
    });
  });

  describe('Mensaje de Ayuda', () => {
    it('debe generar mensaje de ayuda completo', async () => {
      const response = await engine.processMessage('Ayuda', context);

      expect(response.message).toContain('Certificados');
      expect(response.message).toContain('Información Académica');
      expect(response.message).toContain('Estado Académico');
    });

    it('debe personalizar mensaje de ayuda con nombre si hay perfil', async () => {
      context.studentProfile = {
        studentId: 'STU001',
        firstName: 'María',
        lastName: 'González',
        email: 'maria@example.com',
        phone: '+1234567890',
        enrollmentStatus: 'active',
        academicLevel: 'junior',
        lastUpdated: new Date().toISOString(),
      };

      const response = await engine.processMessage('Ayuda', context);

      expect(response.message).toContain('María');
    });
  });

  describe('Intención Desconocida', () => {
    it('debe ofrecer opciones cuando no entiende la intención', async () => {
      const response = await engine.processMessage('xyz abc 123', context);

      expect(response.message).toContain('certificados');
      expect(response.message).toContain('programas');
      expect(response.message).toContain('académico');
    });
  });
});
