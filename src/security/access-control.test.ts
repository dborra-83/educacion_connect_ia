import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AccessControl } from './access-control';
import { AuditLogger } from './audit-logger';

vi.mock('../utils/logger');
vi.mock('./audit-logger');

describe('AccessControl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkAccess', () => {
    it('debe permitir acceso a propios datos', async () => {
      const result = await AccessControl.checkAccess({
        sessionId: 'session-123',
        authenticatedStudentId: 'STU001',
        requestedStudentId: 'STU001',
        resourceType: 'StudentProfile',
        operation: 'getStudentProfile',
      });

      expect(result.allowed).toBe(true);
    });

    it('debe denegar acceso a datos de otro estudiante', async () => {
      const result = await AccessControl.checkAccess({
        sessionId: 'session-123',
        authenticatedStudentId: 'STU001',
        requestedStudentId: 'STU002',
        resourceType: 'StudentProfile',
        operation: 'getStudentProfile',
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('No autorizado');
      expect(AuditLogger.logUnauthorizedAccessAttempt).toHaveBeenCalled();
    });

    it('debe denegar acceso si no está autenticado', async () => {
      const result = await AccessControl.checkAccess({
        sessionId: 'session-123',
        authenticatedStudentId: undefined,
        requestedStudentId: 'STU001',
        resourceType: 'StudentProfile',
        operation: 'getStudentProfile',
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Autenticación requerida');
    });

    it('debe bloquear sesión después de múltiples intentos no autorizados', async () => {
      const sessionId = 'session-suspicious';

      // Primer intento
      await AccessControl.checkAccess({
        sessionId,
        authenticatedStudentId: 'STU001',
        requestedStudentId: 'STU002',
        resourceType: 'StudentProfile',
        operation: 'getStudentProfile',
      });

      // Segundo intento
      await AccessControl.checkAccess({
        sessionId,
        authenticatedStudentId: 'STU001',
        requestedStudentId: 'STU003',
        resourceType: 'StudentProfile',
        operation: 'getStudentProfile',
      });

      // Tercer intento - debe bloquear
      const result = await AccessControl.checkAccess({
        sessionId,
        authenticatedStudentId: 'STU001',
        requestedStudentId: 'STU004',
        resourceType: 'StudentProfile',
        operation: 'getStudentProfile',
      });

      expect(result.allowed).toBe(false);
      expect(result.blocked).toBe(true);
      expect(result.requiresEscalation).toBe(true);
    });

    it('debe denegar acceso a sesión bloqueada', async () => {
      const sessionId = 'session-blocked';

      // Generar 3 intentos para bloquear
      for (let i = 0; i < 3; i++) {
        await AccessControl.checkAccess({
          sessionId,
          authenticatedStudentId: 'STU001',
          requestedStudentId: `STU00${i + 2}`,
          resourceType: 'StudentProfile',
          operation: 'getStudentProfile',
        });
      }

      // Intentar acceso legítimo - debe estar bloqueado
      const result = await AccessControl.checkAccess({
        sessionId,
        authenticatedStudentId: 'STU001',
        requestedStudentId: 'STU001',
        resourceType: 'StudentProfile',
        operation: 'getStudentProfile',
      });

      expect(result.allowed).toBe(false);
      expect(result.blocked).toBe(true);
      expect(result.reason).toContain('bloqueada');
    });

    it('debe permitir operaciones que no requieren autenticación', async () => {
      const result = await AccessControl.checkAccess({
        sessionId: 'session-123',
        authenticatedStudentId: undefined,
        requestedStudentId: 'STU001',
        resourceType: 'KnowledgeBase',
        operation: 'queryKnowledgeBase',
      });

      expect(result.allowed).toBe(true);
    });
  });

  describe('unblockSession', () => {
    it('debe desbloquear una sesión', async () => {
      const sessionId = 'session-to-unblock';

      // Bloquear sesión
      for (let i = 0; i < 3; i++) {
        await AccessControl.checkAccess({
          sessionId,
          authenticatedStudentId: 'STU001',
          requestedStudentId: `STU00${i + 2}`,
          resourceType: 'StudentProfile',
          operation: 'getStudentProfile',
        });
      }

      // Desbloquear
      AccessControl.unblockSession(sessionId);

      // Verificar que ahora puede acceder
      const result = await AccessControl.checkAccess({
        sessionId,
        authenticatedStudentId: 'STU001',
        requestedStudentId: 'STU001',
        resourceType: 'StudentProfile',
        operation: 'getStudentProfile',
      });

      expect(result.allowed).toBe(true);
    });
  });

  describe('getSecurityStats', () => {
    it('debe retornar estadísticas de seguridad', () => {
      const stats = AccessControl.getSecurityStats();

      expect(stats).toHaveProperty('blockedSessions');
      expect(stats).toHaveProperty('suspiciousAttempts');
      expect(typeof stats.blockedSessions).toBe('number');
      expect(typeof stats.suspiciousAttempts).toBe('number');
    });
  });

  describe('cleanupExpiredBlocks', () => {
    it('debe limpiar bloqueos expirados', () => {
      const count = AccessControl.cleanupExpiredBlocks();

      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });
});
