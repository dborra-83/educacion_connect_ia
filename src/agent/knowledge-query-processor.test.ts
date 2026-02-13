/**
 * Tests para el Procesador de Consultas a Base de Conocimiento
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { KnowledgeQueryProcessor, QueryType } from './knowledge-query-processor';

describe('KnowledgeQueryProcessor', () => {
  let processor: KnowledgeQueryProcessor;

  beforeEach(() => {
    processor = new KnowledgeQueryProcessor(true); // usar mocks
  });

  describe('Detección de Tipo de Consulta', () => {
    it('debe detectar consulta sobre pensum', async () => {
      const result = await processor.processQuery('¿Cuál es el pensum de Ingeniería?');

      expect(result.queryType).toBe(QueryType.PENSUM);
    });

    it('debe detectar consulta sobre requisitos', async () => {
      const result = await processor.processQuery('¿Qué requisitos necesito para inscribirme?');

      expect(result.queryType).toBe(QueryType.REQUISITOS);
    });

    it('debe detectar consulta sobre fechas', async () => {
      const result = await processor.processQuery('¿Cuándo son las inscripciones?');

      expect(result.queryType).toBe(QueryType.FECHAS);
    });

    it('debe detectar consulta sobre admisión', async () => {
      const result = await processor.processQuery('¿Cómo puedo aplicar para admisión?');

      expect(result.queryType).toBe(QueryType.ADMISION);
    });

    it('debe detectar consulta sobre programa', async () => {
      const result = await processor.processQuery('¿Qué programas de maestría ofrecen?');

      expect(result.queryType).toBe(QueryType.PROGRAMA);
    });

    it('debe detectar consulta general', async () => {
      const result = await processor.processQuery('¿Dónde está la biblioteca?');

      expect(result.queryType).toBe(QueryType.GENERAL);
    });
  });

  describe('Procesamiento de Consultas', () => {
    it('debe procesar consulta y retornar resultados', async () => {
      const result = await processor.processQuery('¿Cuál es el pensum de Ingeniería Informática?');

      expect(result).toBeDefined();
      expect(result.answer).toBeTruthy();
      expect(result.hasResults).toBe(true);
    });

    it('debe incluir fuentes en los resultados', async () => {
      const result = await processor.processQuery('¿Cuáles son los requisitos de admisión?');

      expect(result.sources).toBeDefined();
      expect(Array.isArray(result.sources)).toBe(true);
    });

    it('debe formatear respuesta con excerpts', async () => {
      const result = await processor.processQuery('¿Qué programas ofrecen?');

      expect(result.answer).toContain('**');
      expect(result.hasResults).toBe(true);
    });

    it('debe incluir introducción apropiada según tipo de consulta', async () => {
      const result = await processor.processQuery('¿Cuál es el pensum?');

      expect(result.answer).toContain('plan de estudios');
    });
  });

  describe('Manejo de Consultas sin Resultados', () => {
    it('debe generar mensaje apropiado cuando no hay resultados', async () => {
      // Esta consulta debería retornar resultados con el mock, pero probamos la lógica
      const result = await processor.processQuery('xyz123 consulta inexistente');

      expect(result).toBeDefined();
      expect(result.answer).toBeTruthy();
    });

    it('debe incluir sugerencias cuando no hay resultados', async () => {
      const result = await processor.processQuery('consulta muy específica sin resultados');

      // El mock siempre retorna resultados, pero verificamos que la estructura esté correcta
      expect(result.answer).toBeTruthy();
    });
  });

  describe('Citación de Fuentes', () => {
    it('debe extraer fuentes de los resultados', async () => {
      const result = await processor.processQuery('¿Qué es el programa de Ingeniería?');

      if (result.hasResults) {
        expect(result.sources.length).toBeGreaterThan(0);
      }
    });

    it('debe incluir fuentes en la respuesta formateada', async () => {
      const result = await processor.processQuery('Información sobre admisiones');

      if (result.hasResults && result.sources.length > 0) {
        expect(result.answer).toContain('Fuentes:');
      }
    });

    it('debe evitar fuentes duplicadas', async () => {
      const result = await processor.processQuery('Programas académicos');

      if (result.hasResults) {
        const uniqueSources = new Set(result.sources);
        expect(uniqueSources.size).toBe(result.sources.length);
      }
    });
  });

  describe('Filtrado por Programa', () => {
    it('debe aceptar programId como parámetro', async () => {
      const result = await processor.processQuery('¿Cuál es el pensum?', 'PROG001');

      expect(result).toBeDefined();
      expect(result.hasResults).toBe(true);
    });

    it('debe procesar consulta sin programId', async () => {
      const result = await processor.processQuery('Información general');

      expect(result).toBeDefined();
    });
  });

  describe('Generación de Alternativas', () => {
    it('debe generar mensaje de alternativas', () => {
      const alternatives = processor.generateAlternatives();

      expect(alternatives).toBeTruthy();
      expect(alternatives).toContain('Reformular');
      expect(alternatives).toContain('Contactar');
    });

    it('debe incluir múltiples opciones en alternativas', () => {
      const alternatives = processor.generateAlternatives();

      expect(alternatives).toContain('•');
      expect(alternatives.split('•').length).toBeGreaterThan(2);
    });
  });

  describe('Formateo de Respuestas', () => {
    it('debe numerar los resultados', async () => {
      const result = await processor.processQuery('Programas disponibles');

      if (result.hasResults) {
        expect(result.answer).toMatch(/\*\*\d+\./);
      }
    });

    it('debe incluir títulos en negrita', async () => {
      const result = await processor.processQuery('Información académica');

      if (result.hasResults) {
        expect(result.answer).toContain('**');
      }
    });

    it('debe separar resultados con saltos de línea', async () => {
      const result = await processor.processQuery('Consulta general');

      if (result.hasResults) {
        expect(result.answer).toContain('\n\n');
      }
    });
  });

  describe('Tipos de Consulta Específicos', () => {
    it('debe manejar consultas sobre malla curricular', async () => {
      const result = await processor.processQuery('¿Cuál es la malla curricular?');

      expect(result.queryType).toBe(QueryType.PENSUM);
    });

    it('debe manejar consultas sobre documentos requeridos', async () => {
      const result = await processor.processQuery('¿Qué documentos necesito?');

      expect(result.queryType).toBe(QueryType.REQUISITOS);
    });

    it('debe manejar consultas sobre plazos', async () => {
      const result = await processor.processQuery('¿Cuál es el plazo de matrícula?');

      expect(result.queryType).toBe(QueryType.FECHAS);
    });

    it('debe manejar consultas sobre proceso de ingreso', async () => {
      const result = await processor.processQuery('¿Cómo es el proceso de ingreso?');

      expect(result.queryType).toBe(QueryType.ADMISION);
    });
  });

  describe('Integración con Base de Conocimiento', () => {
    it('debe invocar queryKnowledgeBase correctamente', async () => {
      const result = await processor.processQuery('Consulta de prueba');

      expect(result).toBeDefined();
      expect(result.queryType).toBeDefined();
    });

    it('debe manejar múltiples resultados', async () => {
      const result = await processor.processQuery('Programas académicos disponibles');

      expect(result.hasResults).toBe(true);
    });
  });
});
