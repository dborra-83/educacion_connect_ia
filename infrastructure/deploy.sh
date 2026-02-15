#!/bin/bash

# Script de despliegue de infraestructura AWS
# Uso: ./deploy.sh [dev|staging|prod]

set -e

ENVIRONMENT=${1:-dev}
STACK_NAME="educacion-connect-ia-${ENVIRONMENT}"
TEMPLATE_FILE="cloudformation-template.yaml"
REGION="us-east-1"

echo "========================================="
echo "Desplegando infraestructura AWS"
echo "Ambiente: ${ENVIRONMENT}"
echo "Stack: ${STACK_NAME}"
echo "Región: ${REGION}"
echo "========================================="

# Validar template
echo "Validando template de CloudFormation..."
aws cloudformation validate-template \
  --template-body file://${TEMPLATE_FILE} \
  --region ${REGION}

# Desplegar stack
echo "Desplegando stack..."
aws cloudformation deploy \
  --template-file ${TEMPLATE_FILE} \
  --stack-name ${STACK_NAME} \
  --parameter-overrides Environment=${ENVIRONMENT} \
  --capabilities CAPABILITY_NAMED_IAM \
  --region ${REGION} \
  --tags \
    Environment=${ENVIRONMENT} \
    Application=EducacionConnectIA \
    ManagedBy=CloudFormation

# Obtener outputs
echo "Obteniendo outputs del stack..."
aws cloudformation describe-stacks \
  --stack-name ${STACK_NAME} \
  --region ${REGION} \
  --query 'Stacks[0].Outputs' \
  --output table

echo "========================================="
echo "Despliegue completado exitosamente"
echo "========================================="

# Guardar outputs en archivo
aws cloudformation describe-stacks \
  --stack-name ${STACK_NAME} \
  --region ${REGION} \
  --query 'Stacks[0].Outputs' \
  --output json > outputs-${ENVIRONMENT}.json

echo "Outputs guardados en: outputs-${ENVIRONMENT}.json"
