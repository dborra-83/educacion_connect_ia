/**
 * Herramienta MCP: queryKnowledgeBase
 * Busca información en la base de conocimiento sobre programas, requisitos y procedimientos
 * Integración con Amazon Kendra o S3
 */

import { QueryKnowledgeBaseInput, KnowledgeBaseResult } from '../types/mcp-tools';
import { EmptyQueryError, NoResultsFoundError, ServiceUnavailableError } from '../types/errors';
import { retryWithBackoff } from '../utils/retry';
import { logger } from '../utils/logger';

/**
 * Valida la entrada de la consulta
 */
function validateQuery(query: string): void {
  if (!query || query.trim().length === 0) {
    throw new EmptyQueryError();
  }
}

/**
 * Consulta la base de conocimiento
 */
export async function queryKnowledgeBase(
  input: QueryKnowledgeBaseInput,
): Promise<KnowledgeBaseResult> {
  const { query, maxResults = 5, filters } = input;

  // Validar entrada
  validateQuery(query);

  logger.info(`Consultando base de conocimiento: "${query}"`);

  try {
    // En producción, aquí se integraría con Amazon Kendra o S3
    // Por ahora usamos mock
    const result = await queryKnowledgeBaseMock(input);

    if (result.totalResults === 0) {
      logger.warn(`No se encontraron resultados para: "${query}"`);
      throw new NoResultsFoundError(query);
    }

    logger.info(`Encontrados ${result.totalResults} resultados para: "${query}"`);

    return result;
  } catch (error) {
    if (error instanceof EmptyQueryError || error instanceof NoResultsFoundError) {
      throw error;
    }

    logger.error(`Error al consultar base de conocimiento:`, error);
    throw new ServiceUnavailableError('KnowledgeBase');
  }
}

/**
 * Mock para desarrollo/testing
 * Simula búsqueda en base de conocimiento
 */
export async function queryKnowledgeBaseMock(
  input: QueryKnowledgeBaseInput,
): Promise<KnowledgeBaseResult> {
  validateQuery(input.query);

  // Simular delay de red
  await new Promise((resolve) => setTimeout(resolve, 150));

  const { query, maxResults = 5, filters } = input;
  const queryLower = query.toLowerCase();

  // Base de conocimiento mock
  const mockDocuments = [
    {
      title: 'Pensum Ingeniería Informática 2024',
      excerpt:
        'El programa de Ingeniería Informática consta de 160 créditos distribuidos en 10 semestres. Incluye materias de programación, bases de datos, redes y desarrollo de software.',
      relevanceScore: 0.95,
      source: 's3://knowledge-base/programs/ing-informatica-pensum.pdf',
      documentType: 'curriculum',
      keywords: ['ingeniería', 'informática', 'pensum', 'programa', 'créditos'],
    },
    {
      title: 'Requisitos de Admisión - Pregrado',
      excerpt:
        'Para ingresar a programas de pregrado se requiere: título de bachiller, examen de admisión aprobado, documentos de identidad y certificado médico.',
      relevanceScore: 0.88,
      source: 's3://knowledge-base/admissions/requisitos-pregrado.pdf',
      documentType: 'requirements',
      keywords: ['admisión', 'requisitos', 'pregrado', 'ingreso'],
    },
    {
      title: 'Fechas de Inscripción 2024-1',
      excerpt:
        'Las inscripciones para el semestre 2024-1 estarán abiertas del 15 de noviembre al 15 de diciembre de 2023. Proceso en línea a través del portal estudiantil.',
      relevanceScore: 0.82,
      source: 's3://knowledge-base/calendar/inscripciones-2024-1.pdf',
      documentType: 'calendar',
      keywords: ['inscripción', 'fechas', 'calendario', 'semestre'],
    },
    {
      title: 'Programa de Maestría en Administración',
      excerpt:
        'Maestría en Administración de Empresas con énfasis en gestión estratégica. Duración: 4 semestres. Modalidad presencial y virtual.',
      relevanceScore: 0.75,
      source: 's3://knowledge-base/programs/maestria-administracion.pdf',
      documentType: 'program_info',
      keywords: ['maestría', 'administración', 'posgrado', 'mba', 'programa'],
    },
    {
      title: 'Proceso de Admisión 2024',
      excerpt:
        'El proceso de admisión incluye: registro en línea, examen de admisión, entrevista personal y revisión de documentos. Resultados en 15 días hábiles.',
      relevanceScore: 0.85,
      source: 's3://knowledge-base/admissions/proceso-admision.pdf',
      documentType: 'admission',
      keywords: ['admisión', 'proceso', 'ingreso', 'aplicar'],
    },
    {
      title: 'Proceso de Solicitud de Certificados',
      excerpt:
        'Los certificados académicos pueden solicitarse en línea. Tiempo de entrega: 3-5 días hábiles. Requisito: estar al día con pagos.',
      relevanceScore: 0.7,
      source: 's3://knowledge-base/procedures/certificados.pdf',
      documentType: 'procedure',
      keywords: ['certificado', 'solicitud', 'trámite', 'documento'],
    },
  ];

  // Filtrar documentos relevantes
  let filteredDocs = mockDocuments.filter((doc) => {
    // Buscar coincidencias en keywords
    const matchesQuery = doc.keywords.some((keyword) => queryLower.includes(keyword));

    // Aplicar filtros si existen
    if (filters?.documentType && filters.documentType.length > 0) {
      return matchesQuery && filters.documentType.includes(doc.documentType);
    }

    return matchesQuery;
  });

  // Ordenar por relevancia
  filteredDocs.sort((a, b) => b.relevanceScore - a.relevanceScore);

  // Limitar resultados
  filteredDocs = filteredDocs.slice(0, maxResults);

  // Si no hay resultados, lanzar error
  if (filteredDocs.length === 0) {
    throw new NoResultsFoundError(query);
  }

  return {
    results: filteredDocs.map((doc) => ({
      title: doc.title,
      excerpt: doc.excerpt,
      relevanceScore: doc.relevanceScore,
      source: doc.source,
      documentType: doc.documentType,
    })),
    totalResults: filteredDocs.length,
  };
}
