/**
 * Procesador de Consultas a Base de Conocimiento
 * Maneja consultas académicas y formatea respuestas con fuentes
 */

import { queryKnowledgeBaseMock } from '../tools/query-knowledge-base';
import { KnowledgeBaseResult } from '../types/mcp-tools';
import { logger } from '../utils/logger';

/**
 * Tipos de consulta académica
 */
export enum QueryType {
  PENSUM = 'pensum',
  REQUISITOS = 'requisitos',
  FECHAS = 'fechas',
  ADMISION = 'admision',
  PROGRAMA = 'programa',
  GENERAL = 'general',
}

/**
 * Resultado de consulta procesada
 */
export interface ProcessedQueryResult {
  queryType: QueryType;
  answer: string;
  sources: string[];
  hasResults: boolean;
}

/**
 * Procesador de consultas a base de conocimiento
 */
export class KnowledgeQueryProcessor {
  private useMock: boolean;

  constructor(useMock: boolean = true) {
    this.useMock = useMock;
  }

  /**
   * Procesa una consulta académica
   */
  async processQuery(query: string, programId?: string): Promise<ProcessedQueryResult> {
    logger.info(`Procesando consulta académica: "${query}"`);

    // 1. Detectar tipo de consulta
    const queryType = this.detectQueryType(query);
    logger.info(`Tipo de consulta detectado: ${queryType}`);

    // 2. Invocar queryKnowledgeBase con parámetros apropiados
    const knowledgeBaseResult = await this.queryKnowledgeBase(query, queryType, programId);

    // 3. Formatear resultados con excerpts y fuentes
    const processedResult = this.formatResults(knowledgeBaseResult, queryType);

    logger.info(
      `Consulta procesada: ${processedResult.hasResults ? 'con resultados' : 'sin resultados'}`,
    );

    return processedResult;
  }

  /**
   * Detecta el tipo de consulta desde el mensaje del usuario
   */
  private detectQueryType(query: string): QueryType {
    const queryLower = query.toLowerCase();

    // Detectar consulta sobre pensum
    if (queryLower.match(/\b(pensum|plan de estudios|malla curricular|materias)\b/)) {
      return QueryType.PENSUM;
    }

    // Detectar consulta sobre requisitos
    if (
      queryLower.match(/\b(requisitos|requerimientos|necesito|documentos|papeles)\b/) &&
      !queryLower.includes('admisión')
    ) {
      return QueryType.REQUISITOS;
    }

    // Detectar consulta sobre fechas
    if (
      queryLower.match(
        /\b(fecha|fechas|cuándo|cuando|plazo|plazos|inscripción|inscripciones|matrícula)\b/,
      )
    ) {
      return QueryType.FECHAS;
    }

    // Detectar consulta sobre admisión
    if (queryLower.match(/\b(admisión|admision|ingreso|ingresar|postular|aplicar)\b/)) {
      return QueryType.ADMISION;
    }

    // Detectar consulta sobre programa específico
    if (
      queryLower.match(
        /\b(programa|carrera|licenciatura|maestría|doctorado|especialización)\b/,
      )
    ) {
      return QueryType.PROGRAMA;
    }

    // Consulta general
    return QueryType.GENERAL;
  }

  /**
   * Consulta la base de conocimiento con parámetros apropiados
   */
  private async queryKnowledgeBase(
    query: string,
    queryType: QueryType,
    programId?: string,
  ): Promise<KnowledgeBaseResult> {
    // Determinar filtros según tipo de consulta
    const filters: Record<string, string> = {};

    if (programId) {
      filters.programId = programId;
    }

    // Agregar filtro de tipo de documento según el tipo de consulta
    switch (queryType) {
      case QueryType.PENSUM:
        filters.documentType = 'curriculum';
        break;
      case QueryType.REQUISITOS:
        filters.documentType = 'requirements';
        break;
      case QueryType.FECHAS:
        filters.documentType = 'calendar';
        break;
      case QueryType.ADMISION:
        filters.documentType = 'admission';
        break;
      case QueryType.PROGRAMA:
        filters.documentType = 'program_info';
        break;
    }

    try {
      return await queryKnowledgeBaseMock({
        query,
        maxResults: 5,
        filters,
      });
    } catch (error) {
      // Si no hay resultados, retornar estructura vacía
      logger.warn(`No se encontraron resultados para: ${query}`);
      return {
        results: [],
        totalResults: 0,
      };
    }
  }

  /**
   * Formatea los resultados con excerpts y fuentes
   */
  private formatResults(
    knowledgeBaseResult: KnowledgeBaseResult,
    queryType: QueryType,
  ): ProcessedQueryResult {
    const { results } = knowledgeBaseResult;

    if (results.length === 0) {
      return {
        queryType,
        answer: this.generateNoResultsMessage(queryType),
        sources: [],
        hasResults: false,
      };
    }

    // Construir respuesta con excerpts
    let answer = this.generateIntroduction(queryType) + '\n\n';

    results.forEach((result, index) => {
      answer += `**${index + 1}. ${result.title}**\n`;
      answer += `${result.excerpt}\n`;

      if (result.metadata?.additionalInfo) {
        answer += `_${result.metadata.additionalInfo}_\n`;
      }

      answer += '\n';
    });

    // Extraer fuentes
    const sources = this.extractSources(results);

    // Agregar citación de fuentes al final
    if (sources.length > 0) {
      answer += '\n---\n**Fuentes:**\n';
      sources.forEach((source, index) => {
        answer += `${index + 1}. ${source}\n`;
      });
    }

    return {
      queryType,
      answer,
      sources,
      hasResults: true,
    };
  }

  /**
   * Genera introducción según el tipo de consulta
   */
  private generateIntroduction(queryType: QueryType): string {
    switch (queryType) {
      case QueryType.PENSUM:
        return 'Aquí está la información sobre el plan de estudios:';
      case QueryType.REQUISITOS:
        return 'Estos son los requisitos que necesitas:';
      case QueryType.FECHAS:
        return 'Aquí están las fechas importantes:';
      case QueryType.ADMISION:
        return 'Información sobre el proceso de admisión:';
      case QueryType.PROGRAMA:
        return 'Información sobre el programa:';
      default:
        return 'Encontré la siguiente información:';
    }
  }

  /**
   * Genera mensaje cuando no hay resultados
   */
  private generateNoResultsMessage(queryType: QueryType): string {
    const baseMessage =
      'No encontré información específica sobre tu consulta en nuestra base de conocimiento.';

    const suggestions: Record<QueryType, string> = {
      [QueryType.PENSUM]:
        'Te recomiendo contactar con el departamento académico para obtener el pensum actualizado.',
      [QueryType.REQUISITOS]:
        'Puedes contactar con la oficina de admisiones para conocer los requisitos específicos.',
      [QueryType.FECHAS]:
        'Te sugiero revisar el calendario académico en el portal web o contactar con registro.',
      [QueryType.ADMISION]:
        'Para información detallada sobre admisiones, contacta con la oficina de admisiones.',
      [QueryType.PROGRAMA]:
        'Puedes obtener más información sobre programas en la oficina de información académica.',
      [QueryType.GENERAL]:
        'Puedes reformular tu pregunta o contactar con nuestro equipo de soporte.',
    };

    return `${baseMessage}\n\n${suggestions[queryType]}`;
  }

  /**
   * Extrae y formatea las fuentes de los resultados
   */
  private extractSources(
    results: Array<{
      title: string;
      excerpt: string;
      relevanceScore: number;
      source: string;
      documentType: string;
    }>,
  ): string[] {
    const sources: string[] = [];
    const seenSources = new Set<string>();

    results.forEach((result) => {
      if (result.source && !seenSources.has(result.source)) {
        sources.push(result.source);
        seenSources.add(result.source);
      }
    });

    return sources;
  }

  /**
   * Genera respuesta con alternativas cuando no hay resultados
   */
  generateAlternatives(): string {
    return (
      'Si no encuentras lo que buscas, puedes:\n\n' +
      '• Reformular tu pregunta con más detalles\n' +
      '• Contactar con la oficina de información académica\n' +
      '• Visitar nuestro portal web para más recursos\n' +
      '• Solicitar hablar con un asesor académico'
    );
  }
}
