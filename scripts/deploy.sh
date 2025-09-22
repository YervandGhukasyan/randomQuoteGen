#!/bin/bash

# deploy script for the quote api
# usage: ./scripts/deploy.sh [dev|staging|prod]

set -e  # exit on any error

ENVIRONMENT=${1:-dev}
PROJECT_NAME="quote-api"

echo "🚀 Deploying $PROJECT_NAME to $ENVIRONMENT..."

# check if we have terraform
if ! command -v terraform &> /dev/null; then
    echo "❌ Terraform not found. Please install it first."
    exit 1
fi

# check if we have azure cli
if ! command -v az &> /dev/null; then
    echo "❌ Azure CLI not found. Please install it first."
    exit 1
fi

# make sure we're logged in
echo "🔐 Checking Azure login..."
az account show > /dev/null || {
    echo "❌ Not logged into Azure. Run 'az login' first."
    exit 1
}

# build the app first
echo "🔨 Building the application..."
npm ci
npm run build
npm test

# deploy infrastructure with terraform
echo "🏗️  Deploying infrastructure..."
cd terraform

# initialize terraform if needed
if [ ! -d ".terraform" ]; then
    terraform init
fi

# plan and apply
terraform plan -var="environment=$ENVIRONMENT" -out=tfplan
terraform apply tfplan

# get outputs
APP_NAME=$(terraform output -raw app_name)
RESOURCE_GROUP=$(terraform output -raw resource_group_name)
APP_URL=$(terraform output -raw app_url)

cd ..

# deploy the app code
echo "📦 Deploying application code..."
az webapp deployment source config-zip \
    --resource-group "$RESOURCE_GROUP" \
    --name "$APP_NAME" \
    --src "./dist.zip"

# create zip file for deployment
echo "📦 Creating deployment package..."
zip -r dist.zip dist/ package.json node_modules/ -x "node_modules/.cache/*" "**/*.test.*"

echo "✅ Deployment complete!"
echo "🌐 App URL: $APP_URL"
echo "📊 Check logs: az webapp log tail --resource-group $RESOURCE_GROUP --name $APP_NAME"
