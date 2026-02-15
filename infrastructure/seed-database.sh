#!/bin/bash

# Script para poblar DynamoDB con datos de prueba
# Uso: ./seed-database.sh [dev|staging|prod]

set -e

ENVIRONMENT=${1:-dev}
TABLE_NAME="${ENVIRONMENT}-student-profiles"
REGION="us-east-1"
DATA_FILE="seed-data.json"

echo "========================================="
echo "Poblando base de datos con datos de prueba"
echo "Ambiente: ${ENVIRONMENT}"
echo "Tabla: ${TABLE_NAME}"
echo "========================================="

# Verificar que la tabla existe
echo "Verificando que la tabla existe..."
aws dynamodb describe-table \
  --table-name ${TABLE_NAME} \
  --region ${REGION} \
  > /dev/null 2>&1

if [ $? -ne 0 ]; then
  echo "Error: La tabla ${TABLE_NAME} no existe"
  exit 1
fi

# Cargar estudiantes
echo "Cargando estudiantes..."
jq -c '.students[]' ${DATA_FILE} | while read student; do
  STUDENT_ID=$(echo $student | jq -r '.studentId')
  echo "  Insertando estudiante: ${STUDENT_ID}"
  
  aws dynamodb put-item \
    --table-name ${TABLE_NAME} \
    --item "$(echo $student | jq -c '{
      studentId: {S: .studentId},
      firstName: {S: .firstName},
      lastName: {S: .lastName},
      email: {S: .email},
      phone: {S: .phone},
      program: {S: .program},
      enrollmentDate: {S: .enrollmentDate},
      expectedGraduationDate: {S: .expectedGraduationDate},
      academicStatus: {S: .academicStatus},
      currentSemester: {N: (.currentSemester | tostring)},
      gpa: {N: (.gpa | tostring)},
      totalCredits: {N: (.totalCredits | tostring)},
      completedCredits: {N: (.completedCredits | tostring)},
      financialStatus: {M: {
        hasDebts: {BOOL: .financialStatus.hasDebts},
        totalDebt: {N: (.financialStatus.totalDebt | tostring)},
        lastPaymentDate: {S: .financialStatus.lastPaymentDate}
      }},
      contactPreferences: {M: {
        preferredLanguage: {S: .contactPreferences.preferredLanguage},
        preferredChannel: {S: .contactPreferences.preferredChannel}
      }}
    }')" \
    --region ${REGION}
done

echo "========================================="
echo "Base de datos poblada exitosamente"
echo "========================================="

# Verificar datos insertados
echo "Verificando datos insertados..."
ITEM_COUNT=$(aws dynamodb scan \
  --table-name ${TABLE_NAME} \
  --select COUNT \
  --region ${REGION} \
  --query 'Count' \
  --output text)

echo "Total de estudiantes en la tabla: ${ITEM_COUNT}"
