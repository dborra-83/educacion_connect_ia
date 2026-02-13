/**
 * Tests para queryKnowledgeBase
 */

import { describe, it, expect } from 'vitest';
import { queryKnowledgeBaseMock } from './query-knowledge-base';
import { EmptyQueryError, NoResultsFoundError } from '../types/errors';

describe('queryKnowledgeBase', () => {
  describe('Casos de éxito', () => {
    it('debe retornar resultados para consulta sobre pensum', async () => {
      const result = await queryKnowledgeBaseMock({
        query: '¿Cuál es el pensum de Ingeniería Informática?',
      });

      expect(result).toBeDefined();
      expect(result.totalResults).toBeGreaterThan(0);
      expect(result.results).toHaveLength(result.totalResults);
      expect(result.results[0].title).toContain('Ingeniería Informática');
    });

    it('debe retornar resultados para consulta sobre requisitos', async () => {
      const result = await queryKnowledgeBaseMock({
        query: 'requisitos de admisión',
      });

      expect(result.totalResults).toBeGreaterThan(0);
      expect(result.results[0].documentType).toBe('requirements');
    });

    it('debe retornar resultados para consulta sobre fechas', async () => {
      const result = await queryKnowledgeBaseMock({
        query: 'fechas de inscripción',
      });

      expect(result.totalResults).toBeGreaterThan(0);
      expect(result.results[0].excerpt).toContain('inscripciones');
    });

    it('debe limitar resultados según maxResults', async () => {
      const result = await queryKnowledgeBaseMock({
        query: 'programa',
        maxResults: 2,
      });

      expect(result.results.length).toBeLessThanOrEqual(2);
    });

    it('debe filtrar por tipo de documento', async () => {
      const result = await queryKnowledgeBaseMock({
        query: 'programa',
        filters: {
          documentType: ['program_info'],
        },
      });

      expect(result.totalResults).toBeGreaterThan(0);
      result.results.forEach((doc) => {
        expect(doc.documentType).toBe('program_info');
      });
    });
  });

  describe('Casos de error', () => {
    it('debe lanzar EmptyQueryError cuando la consulta está vacía', async () => {
      await expect(
        queryKnowledgeBaseMock({
          query: '',
        }),
      ).rejects.toThrow(EmptyQueryError);
    });

    it('debe lanzar EmptyQueryError cuando la consulta es solo espacios', async () => {
      await expect(
        queryKnowledgeBaseMock({
          query: '   ',
        }),
      ).rejects.toThrow(EmptyQueryError);
    });

    it('debe lanzar NoResultsFoundError cuando no hay coincidencias', async () => {
      await expect(
        queryKnowledgeBaseMock({
          query: 'xyz123abc456def789',
        }),
      ).rejects.toThrow(NoResultsFoundError);
    });
  });

  describe('Validación de resultados', () => {
    it('debe incluir todos los campos requeridos en cada resultado', async () => {
      const result = await queryKnowledgeBaseMock({
        query: 'ingeniería',
      });

      result.results.forEach((doc) => {
        expect(doc.title).toBeTruthy();
        expect(doc.excerpt).toBeTruthy();
        expect(doc.relevanceScore).toBeGreaterThan(0);
        expect(doc.relevanceScore).toBeLessThanOrEqual(1);
        expect(doc.source).toBeTruthy();
        expect(doc.documentType).toBeTruthy();
      });
    });

    it('debe ordenar resultados por relevancia descendente', async () => {
      const result = await queryKnowledgeBaseMock({
        query: 'programa',
      });

      for (let i = 1; i < result.results.length; i++) {
        expect(result.results[i - 1].relevanceScore).toBeGreaterThanOrEqual(
          result.results[i].relevanceScore,
        );
      }
    });

    it('debe incluir fuente del documento', async () => {
      const result = await queryKnowledgeBaseMock({
        query: 'certificado',
      });

      expect(result.results[0].source).toMatch(/^s3:\/\//);
    });
  });
});
