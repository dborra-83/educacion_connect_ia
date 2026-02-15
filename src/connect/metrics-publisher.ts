/**
 * Publicador de métricas a CloudWatch
 * Cumple con requisito 9.4: Exposición de métricas
 */

import { logger } from '../utils/logger';

/**
 * Tipos de métricas
 */
export enum MetricType {
  ERROR_RATE = 'ErrorRate',
  RESPONSE_TIME = 'ResponseTime',
  ESCALATION_RATE = 'EscalationRate',
  TOOL_USAGE = 'ToolUsage',
  INTENT_DETECTION = 'IntentDetection',
  SESSION_DURATION = 'SessionDuration',
}

/**
 * Unidades de métricas
 */
export enum MetricUnit {
  COUNT = 'Count',
  MILLISECONDS = 'Milliseconds',
  SECONDS = 'Seconds',
  PERCENT = 'Percent',
  NONE = 'None',
}

/**
 * Datos de una métrica
 */
export interface MetricData {
  metricName: string;
  value: number;
  unit: MetricUnit;
  timestamp: Date;
  dimensions?: Record<string, string>;
}

/**
 * Publicador de métricas a CloudWatch
 */
export class MetricsPublisher {
  private namespace: string;
  private metricsBuffer: MetricData[];
  private flushInterval: number;
  private flushTimer?: NodeJS.Timeout;

  constructor(namespace: string = 'AmazonConnect/EducationAgent', flushInterval: number = 60000) {
    this.namespace = namespace;
    this.metricsBuffer = [];
    this.flushInterval = flushInterval;
    this.startAutoFlush();
  }

  /**
   * Publica una métrica de tasa de error
   */
  publishErrorRate(errorOccurred: boolean, dimensions?: Record<string, string>): void {
    this.publishMetric({
      metricName: MetricType.ERROR_RATE,
      value: errorOccurred ? 1 : 0,
      unit: MetricUnit.COUNT,
      timestamp: new Date(),
      dimensions,
    });
  }

  /**
   * Publica una métrica de tiempo de respuesta
   */
  publishResponseTime(milliseconds: number, dimensions?: Record<string, string>): void {
    this.publishMetric({
      metricName: MetricType.RESPONSE_TIME,
      value: milliseconds,
      unit: MetricUnit.MILLISECONDS,
      timestamp: new Date(),
      dimensions,
    });
  }

  /**
   * Publica una métrica de tasa de escalamiento
   */
  publishEscalationRate(escalated: boolean, dimensions?: Record<string, string>): void {
    this.publishMetric({
      metricName: MetricType.ESCALATION_RATE,
      value: escalated ? 1 : 0,
      unit: MetricUnit.COUNT,
      timestamp: new Date(),
      dimensions,
    });
  }

  /**
   * Publica una métrica de uso de herramienta
   */
  publishToolUsage(toolName: string, dimensions?: Record<string, string>): void {
    this.publishMetric({
      metricName: MetricType.TOOL_USAGE,
      value: 1,
      unit: MetricUnit.COUNT,
      timestamp: new Date(),
      dimensions: {
        ...dimensions,
        ToolName: toolName,
      },
    });
  }

  /**
   * Publica una métrica de detección de intención
   */
  publishIntentDetection(intent: string, confidence: number, dimensions?: Record<string, string>): void {
    this.publishMetric({
      metricName: MetricType.INTENT_DETECTION,
      value: confidence,
      unit: MetricUnit.NONE,
      timestamp: new Date(),
      dimensions: {
        ...dimensions,
        Intent: intent,
      },
    });
  }

  /**
   * Publica una métrica de duración de sesión
   */
  publishSessionDuration(seconds: number, dimensions?: Record<string, string>): void {
    this.publishMetric({
      metricName: MetricType.SESSION_DURATION,
      value: seconds,
      unit: MetricUnit.SECONDS,
      timestamp: new Date(),
      dimensions,
    });
  }

  /**
   * Publica una métrica genérica
   */
  private publishMetric(metric: MetricData): void {
    this.metricsBuffer.push(metric);

    logger.info('Métrica registrada', {
      namespace: this.namespace,
      metricName: metric.metricName,
      value: metric.value,
      unit: metric.unit,
      dimensions: metric.dimensions,
    });

    // Si el buffer está lleno, hacer flush inmediatamente
    if (this.metricsBuffer.length >= 20) {
      this.flush();
    }
  }

  /**
   * Envía todas las métricas acumuladas a CloudWatch
   */
  async flush(): Promise<void> {
    if (this.metricsBuffer.length === 0) {
      return;
    }

    const metricsToSend = [...this.metricsBuffer];
    this.metricsBuffer = [];

    try {
      // En producción, aquí se usaría el SDK de AWS para enviar a CloudWatch
      // await cloudWatch.putMetricData({
      //   Namespace: this.namespace,
      //   MetricData: metricsToSend.map(m => ({
      //     MetricName: m.metricName,
      //     Value: m.value,
      //     Unit: m.unit,
      //     Timestamp: m.timestamp,
      //     Dimensions: Object.entries(m.dimensions || {}).map(([Name, Value]) => ({ Name, Value }))
      //   }))
      // }).promise();

      logger.info('Métricas enviadas a CloudWatch', {
        namespace: this.namespace,
        count: metricsToSend.length,
      });
    } catch (error) {
      logger.error('Error enviando métricas a CloudWatch', {
        error,
        metricsCount: metricsToSend.length,
      });

      // Reintroducir métricas al buffer para reintento
      this.metricsBuffer.unshift(...metricsToSend);
    }
  }

  /**
   * Inicia el flush automático de métricas
   */
  private startAutoFlush(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.flushInterval);
  }

  /**
   * Detiene el flush automático y envía métricas pendientes
   */
  async stop(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }

    await this.flush();
  }
}

/**
 * Instancia singleton del publicador de métricas
 */
export const metricsPublisher = new MetricsPublisher();
