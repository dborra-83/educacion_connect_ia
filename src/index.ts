/**
 * Punto de entrada principal para Lambda Handler de Amazon Connect
 */

import { ConnectHandler, ConnectEvent } from './connect/connect-handler';

const connectHandler = new ConnectHandler();

/**
 * Lambda Handler para eventos de Amazon Connect
 * @param event Evento de Amazon Connect
 * @param context Contexto de Lambda
 */
export const handler = async (event: any, context: any): Promise<any> => {
  console.log('Lambda Handler - Event:', JSON.stringify(event));
  console.log('Lambda Handler - Context:', JSON.stringify(context));

  try {
    // Si el evento ya tiene la estructura de Amazon Connect, usarlo directamente
    if (event.Details?.ContactData) {
      return await connectHandler.handleEvent(event as ConnectEvent);
    }

    // Si no, construir evento de Amazon Connect desde parámetros simples
    const connectEvent: ConnectEvent = {
      Details: {
        ContactData: {
          Attributes: {
            studentId: event.studentId || '',
            ...event.attributes
          },
          ContactId: event.contactId || event.sessionId || context.awsRequestId,
          InitialContactId: event.contactId || event.sessionId || context.awsRequestId,
          Channel: event.channel || 'VOICE',
          InstanceARN: process.env.CONNECT_INSTANCE_ARN || 'arn:aws:connect:us-east-1:520754296204:instance/983955e0-57a9-4633-aad0-f87f18072f04'
        },
        Parameters: {
          message: event.message || '',
          ...event.parameters
        }
      },
      Name: 'ContactFlowEvent'
    };

    // Procesar con ConnectHandler
    const response = await connectHandler.handleEvent(connectEvent);

    return response;

  } catch (error: any) {
    console.error('Error en Lambda Handler:', error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'InternalError',
        message: 'Error al procesar la solicitud'
      })
    };
  }
};

// Exportar para uso local/testing
export { ConnectHandler } from './connect/connect-handler';
export { ReasoningEngine } from './agent/reasoning-engine';
export * from './types';
export * from './tools';
