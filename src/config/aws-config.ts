/**
 * Configuración de AWS y servicios
 */

export const awsConfig = {
  region: process.env.AWS_REGION || 'us-east-1',
  accountId: process.env.AWS_ACCOUNT_ID || '520754296204',

  connect: {
    instanceId: process.env.CONNECT_INSTANCE_ID || '983955e0-57a9-4633-aad0-f87f18072f04',
    instanceArn:
      process.env.CONNECT_INSTANCE_ARN ||
      'arn:aws:connect:us-east-1:520754296204:instance/983955e0-57a9-4633-aad0-f87f18072f04',
    instanceAlias: process.env.CONNECT_INSTANCE_ALIAS || 'ch-latam-educacion',
  },

  dynamodb: {
    studentProfilesTable: process.env.STUDENT_PROFILES_TABLE || 'StudentProfiles',
  },

  lambda: {
    academicApiArn: process.env.ACADEMIC_API_LAMBDA_ARN || '',
    certificateGeneratorArn: process.env.CERTIFICATE_GENERATOR_LAMBDA_ARN || '',
  },

  knowledgeBase: {
    s3Bucket: process.env.KNOWLEDGE_BASE_BUCKET || '',
    kendraIndexId: process.env.KENDRA_INDEX_ID || '',
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
};
