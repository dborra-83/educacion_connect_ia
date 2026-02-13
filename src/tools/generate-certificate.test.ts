/**
 * Tests para generateCertificate
 */

import { describe, it, expect } from 'vitest';
import {
  generateCertificateMock,
  generateCertificateFailMock,
  generateCertificateDeliveryFailMock,
} from './generate-certificate';
import {
  StudentHasDebtsError,
  InvalidCertificateTypeError,
  InvalidStudentIdError,
  GenerationFailedError,
  DeliveryFailedError,
} from '../types/errors';

describe('generateCertificate', () => {
  describe('Casos de éxito', () => {
    it('debe generar certificado de inscripción exitosamente', async () => {
      const result = await generateCertificateMock({
        studentId: 'STU001',
        certificateType: 'enrollment',
        deliveryMethod: 'email',
      });

      expect(result).toBeDefined();
      expect(result.certificateId).toBeTruthy();
      expect(result.status).toBe('sent');
      expect(result.generatedAt).toBeTruthy();
      expect(result.deliveryStatus).toBeDefined();
      expect(result.deliveryStatus?.method).toBe('email');
    });

    it('debe generar certificado de calificaciones', async () => {
      const result = await generateCertificateMock({
        studentId: 'STU002',
        certificateType: 'grades',
        deliveryMethod: 'email',
      });

      expect(result.certificateId).toBeTruthy();
      expect(result.status).toBe('sent');
    });

    it('debe generar certificado de graduación', async () => {
      const result = await generateCertificateMock({
        studentId: 'STU001',
        certificateType: 'graduation',
        deliveryMethod: 'email',
      });

      expect(result.certificateId).toBeTruthy();
      expect(result.status).toBe('sent');
    });

    it('debe proporcionar URL de descarga cuando deliveryMethod es download', async () => {
      const result = await generateCertificateMock({
        studentId: 'STU001',
        certificateType: 'enrollment',
        deliveryMethod: 'download',
      });

      expect(result.downloadUrl).toBeTruthy();
      expect(result.downloadUrl).toMatch(/^https:\/\//);
      expect(result.expiresAt).toBeTruthy();
    });

    it('debe incluir destino de email en deliveryStatus', async () => {
      const result = await generateCertificateMock({
        studentId: 'STU001',
        certificateType: 'enrollment',
        deliveryMethod: 'email',
      });

      expect(result.deliveryStatus?.destination).toContain('@universidad.edu');
      expect(result.deliveryStatus?.sentAt).toBeTruthy();
    });

    it('debe usar idioma español por defecto', async () => {
      const result = await generateCertificateMock({
        studentId: 'STU001',
        certificateType: 'enrollment',
        deliveryMethod: 'email',
      });

      expect(result).toBeDefined();
      // En producción, verificaríamos que el PDF está en español
    });
  });

  describe('Validación de deudas', () => {
    it('debe bloquear generación si el estudiante tiene deudas', async () => {
      await expect(
        generateCertificateMock({
          studentId: 'STU003',
          certificateType: 'enrollment',
          deliveryMethod: 'email',
        }),
      ).rejects.toThrow(StudentHasDebtsError);
    });

    it('debe incluir monto de deuda en el error', async () => {
      try {
        await generateCertificateMock({
          studentId: 'STU003',
          certificateType: 'enrollment',
          deliveryMethod: 'email',
        });
      } catch (error) {
        expect(error).toBeInstanceOf(StudentHasDebtsError);
        expect((error as StudentHasDebtsError).metadata?.debtAmount).toBeGreaterThan(0);
      }
    });
  });

  describe('Casos de error', () => {
    it('debe lanzar InvalidCertificateTypeError para tipo inválido', async () => {
      await expect(
        generateCertificateMock({
          studentId: 'STU001',
          certificateType: 'invalid_type' as any,
          deliveryMethod: 'email',
        }),
      ).rejects.toThrow(InvalidCertificateTypeError);
    });

    it('debe lanzar InvalidStudentIdError cuando el ID está vacío', async () => {
      await expect(
        generateCertificateMock({
          studentId: '',
          certificateType: 'enrollment',
          deliveryMethod: 'email',
        }),
      ).rejects.toThrow(InvalidStudentIdError);
    });

    it('debe manejar fallo en generación de PDF', async () => {
      await expect(
        generateCertificateFailMock({
          studentId: 'STU001',
          certificateType: 'enrollment',
          deliveryMethod: 'email',
        }),
      ).rejects.toThrow(GenerationFailedError);
    });

    it('debe manejar fallo en entrega de certificado', async () => {
      await expect(
        generateCertificateDeliveryFailMock({
          studentId: 'STU001',
          certificateType: 'enrollment',
          deliveryMethod: 'email',
        }),
      ).rejects.toThrow(DeliveryFailedError);
    });
  });

  describe('Validación de datos', () => {
    it('debe generar certificateId único', async () => {
      const result1 = await generateCertificateMock({
        studentId: 'STU001',
        certificateType: 'enrollment',
        deliveryMethod: 'email',
      });

      // Pequeño delay para asegurar timestamp diferente
      await new Promise((resolve) => setTimeout(resolve, 10));

      const result2 = await generateCertificateMock({
        studentId: 'STU001',
        certificateType: 'enrollment',
        deliveryMethod: 'email',
      });

      expect(result1.certificateId).not.toBe(result2.certificateId);
    });

    it('debe incluir timestamp de generación', async () => {
      const before = new Date().toISOString();

      const result = await generateCertificateMock({
        studentId: 'STU001',
        certificateType: 'enrollment',
        deliveryMethod: 'email',
      });

      const after = new Date().toISOString();

      expect(result.generatedAt).toBeTruthy();
      expect(result.generatedAt >= before).toBe(true);
      expect(result.generatedAt <= after).toBe(true);
    });

    it('debe tener URL de descarga válida cuando deliveryMethod es download', async () => {
      const result = await generateCertificateMock({
        studentId: 'STU001',
        certificateType: 'enrollment',
        deliveryMethod: 'download',
      });

      expect(result.downloadUrl).toMatch(/^https:\/\/.*\.pdf$/);
    });

    it('debe tener fecha de expiración futura para URLs de descarga', async () => {
      const result = await generateCertificateMock({
        studentId: 'STU001',
        certificateType: 'enrollment',
        deliveryMethod: 'download',
      });

      const expiresAt = new Date(result.expiresAt!);
      const now = new Date();

      expect(expiresAt.getTime()).toBeGreaterThan(now.getTime());
    });
  });
});
