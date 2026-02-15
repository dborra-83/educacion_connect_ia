#!/bin/bash

# Script para subir documentos a S3 (base de conocimiento)
# Uso: ./upload-knowledge-base.sh [dev|staging|prod]

set -e

ENVIRONMENT=${1:-dev}
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
BUCKET_NAME="${ENVIRONMENT}-educacion-knowledge-base-${ACCOUNT_ID}"
REGION="us-east-1"
DATA_FILE="seed-data.json"

echo "========================================="
echo "Subiendo documentos a base de conocimiento"
echo "Ambiente: ${ENVIRONMENT}"
echo "Bucket: ${BUCKET_NAME}"
echo "========================================="

# Verificar que el bucket existe
echo "Verificando que el bucket existe..."
aws s3 ls s3://${BUCKET_NAME} --region ${REGION} > /dev/null 2>&1

if [ $? -ne 0 ]; then
  echo "Error: El bucket ${BUCKET_NAME} no existe"
  exit 1
fi

# Crear directorio temporal para documentos
TEMP_DIR=$(mktemp -d)
echo "Directorio temporal: ${TEMP_DIR}"

# Extraer y crear documentos
echo "Creando documentos..."
jq -c '.knowledgeBaseDocuments[]' ${DATA_FILE} | while read doc; do
  DOC_ID=$(echo $doc | jq -r '.documentId')
  DOC_TITLE=$(echo $doc | jq -r '.title')
  DOC_TYPE=$(echo $doc | jq -r '.type')
  DOC_PROGRAM=$(echo $doc | jq -r '.program')
  DOC_CONTENT=$(echo $doc | jq -r '.content')
  
  # Crear archivo de documento
  DOC_FILE="${TEMP_DIR}/${DOC_ID}.json"
  echo $doc | jq '.' > ${DOC_FILE}
  
  echo "  Subiendo documento: ${DOC_ID} - ${DOC_TITLE}"
  
  # Subir a S3
  aws s3 cp ${DOC_FILE} \
    s3://${BUCKET_NAME}/documents/${DOC_TYPE}/${DOC_ID}.json \
    --region ${REGION} \
    --metadata "title=${DOC_TITLE},type=${DOC_TYPE},program=${DOC_PROGRAM}"
done

# Limpiar directorio temporal
rm -rf ${TEMP_DIR}

echo "========================================="
echo "Documentos subidos exitosamente"
echo "========================================="

# Listar documentos en S3
echo "Documentos en S3:"
aws s3 ls s3://${BUCKET_NAME}/documents/ --recursive --region ${REGION}
