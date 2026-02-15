/**
 * Lambda Handler para Generación de Certificados
 * Simula la generación de certificados académicos en PDF
 */

import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { unmarshall } from '@aws-sdk/util-dynamodb';

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });

const TABLE_NAME = process.env.DYNAMODB_TABLE || 'dev-student-profiles';
const BUCKET_NAME = process.env.S3_BUCKET || 'dev-educacion-knowledge-base';

interface CertificateRequest {
  studentId: string;
  certificateType: 'enrollment' | 'grades' | 'graduation';
  deliveryMethod: 'email' | 'download';
  language?: 'es' | 'en';
}

interface CertificateResponse {
  certificateNumber: string;
  generatedAt: string;
  downloadUrl?: string;
  emailSent?: boolean;
  expiresAt?: string;
}

export const handler = async (event: any): Promise<any> => {
  console.log('Certificate Generation - Event:', JSON.stringify(event));

  try {
    const request: CertificateRequest = typeof event.body === 'string' 
      ? JSON.parse(event.body) 
      : event;

    // Validar request
    if (!request.studentId || !request.certificateType) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'InvalidRequest',
          message: 'studentId y certificateType son requeridos'
        })
      };
    }

    // Obtener perfil del estudiante
    const getItemCommand = new GetItemCommand({
      TableName: TABLE_NAME,
      Key: {
        studentId: { S: request.studentId }
      }
    });

    const result = await dynamoClient.send(getItemCommand);

    if (!result.Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          error: 'StudentNotFound',
          message: `Estudiante ${request.studentId} no encontrado`
        })
      };
    }

    const student = unmarshall(result.Item);

    // Verificar deudas
    if (student.financialStatus?.hasDebts) {
      return {
        statusCode: 403,
        body: JSON.stringify({
          error: 'StudentHasDebts',
          message: 'El estudiante tiene deudas pendientes',
          debtAmount: student.financialStatus.totalDebt
        })
      };
    }

    // Generar certificado
    const certificate = await generateCertificate(student, request);

    // Guardar en S3
    const s3Key = `certificates/${request.studentId}/${certificate.certificateNumber}.pdf`;
    await saveCertificateToS3(s3Key, certificate);

    // Preparar respuesta
    const response: CertificateResponse = {
      certificateNumber: certificate.certificateNumber,
      generatedAt: certificate.generatedAt,
    };

    if (request.deliveryMethod === 'download') {
      // Generar URL pre-firmada (válida por 7 días)
      response.downloadUrl = `https://${BUCKET_NAME}.s3.amazonaws.com/${s3Key}`;
      response.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    } else if (request.deliveryMethod === 'email') {
      // Simular envío de email
      await sendCertificateByEmail(student.email, certificate);
      response.emailSent = true;
    }

    return {
      statusCode: 200,
      body: JSON.stringify(response)
    };

  } catch (error: any) {
    console.error('Error en Certificate Generation:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'GenerationFailed',
        message: 'Error al generar certificado'
      })
    };
  }
};

async function generateCertificate(student: any, request: CertificateRequest): Promise<any> {
  const certificateNumber = `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  const language = request.language || student.contactPreferences?.preferredLanguage || 'es';

  const certificate = {
    certificateNumber,
    generatedAt: new Date().toISOString(),
    studentId: student.studentId,
    studentName: `${student.firstName} ${student.lastName}`,
    program: student.program,
    certificateType: request.certificateType,
    language,
    content: generateCertificateContent(student, request.certificateType, language)
  };

  return certificate;
}

function generateCertificateContent(student: any, type: string, language: string): string {
  const name = `${student.firstName} ${student.lastName}`;
  const program = student.program;
  const date = new Date().toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US');

  if (language === 'es') {
    switch (type) {
      case 'enrollment':
        return `La Universidad certifica que ${name} se encuentra matriculado(a) en el programa de ${program}. Fecha: ${date}`;
      case 'grades':
        return `La Universidad certifica que ${name} ha cursado el programa de ${program} con un promedio de ${student.gpa}. Fecha: ${date}`;
      case 'graduation':
        return `La Universidad certifica que ${name} ha completado satisfactoriamente el programa de ${program}. Fecha: ${date}`;
      default:
        return `Certificado para ${name}. Fecha: ${date}`;
    }
  } else {
    switch (type) {
      case 'enrollment':
        return `The University certifies that ${name} is enrolled in the ${program} program. Date: ${date}`;
      case 'grades':
        return `The University certifies that ${name} has completed the ${program} program with a GPA of ${student.gpa}. Date: ${date}`;
      case 'graduation':
        return `The University certifies that ${name} has successfully completed the ${program} program. Date: ${date}`;
      default:
        return `Certificate for ${name}. Date: ${date}`;
    }
  }
}

async function saveCertificateToS3(key: string, certificate: any): Promise<void> {
  const putCommand = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: JSON.stringify(certificate, null, 2),
    ContentType: 'application/json',
    Metadata: {
      certificateNumber: certificate.certificateNumber,
      studentId: certificate.studentId,
      certificateType: certificate.certificateType
    }
  });

  await s3Client.send(putCommand);
  console.log(`Certificado guardado en S3: ${key}`);
}

async function sendCertificateByEmail(email: string, certificate: any): Promise<void> {
  // Simular envío de email
  console.log(`Enviando certificado ${certificate.certificateNumber} a ${email}`);
  
  // En producción, aquí se usaría Amazon SES
  // const sesClient = new SESClient({ region: 'us-east-1' });
  // await sesClient.send(new SendEmailCommand({...}));
  
  // Por ahora solo logueamos
  console.log('Email enviado exitosamente (simulado)');
}
