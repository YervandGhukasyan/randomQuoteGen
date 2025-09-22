#!/bin/bash

# script to set up azure authentication for github actions
# run this once to configure OIDC authentication

set -e

# check if user provided required params
if [ $# -ne 2 ]; then
    echo "Usage: $0 <github-repo> <azure-subscription-id>"
    echo "Example: $0 myuser/quote-api 12345678-1234-1234-1234-123456789012"
    exit 1
fi

GITHUB_REPO=$1
AZURE_SUBSCRIPTION_ID=$2
APP_NAME="github-actions-quote-api-$(date +%s)"

echo "🔧 Setting up Azure authentication for GitHub Actions..."
echo "📁 Repository: $GITHUB_REPO"
echo "🔑 Subscription: $AZURE_SUBSCRIPTION_ID"

# make sure user is logged in
echo "🔐 Checking Azure login..."
az account show > /dev/null || {
    echo "❌ Not logged into Azure. Run 'az login' first."
    exit 1
}

# create app registration
echo "📱 Creating app registration..."
APP_ID=$(az ad app create \
    --display-name "$APP_NAME" \
    --query appId \
    --output tsv)

echo "✅ App registration created: $APP_ID"

# create service principal
echo "👤 Creating service principal..."
SP_ID=$(az ad sp create \
    --id "$APP_ID" \
    --query id \
    --output tsv)

echo "✅ Service principal created: $SP_ID"

# get tenant id
TENANT_ID=$(az account show --query tenantId --output tsv)

# create federated credential for main branch
echo "🔗 Creating federated credential..."
cat > federated-credential.json << EOF
{
  "name": "github-actions-main",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:$GITHUB_REPO:ref:refs/heads/main",
  "audiences": ["api://AzureADTokenExchange"]
}
EOF

az ad app federated-credential create \
    --id "$APP_ID" \
    --parameters @federated-credential.json

echo "✅ Federated credential created"

# grant contributor permissions
echo "🔑 Granting Azure permissions..."
az role assignment create \
    --assignee "$SP_ID" \
    --role Contributor \
    --scope "/subscriptions/$AZURE_SUBSCRIPTION_ID"

echo "✅ Permissions granted"

# cleanup temp file
rm federated-credential.json

echo ""
echo "🎉 Azure authentication setup complete!"
echo ""
echo "📝 Add these secrets to your GitHub repository:"
echo "   AZURE_CLIENT_ID: $APP_ID"
echo "   AZURE_TENANT_ID: $TENANT_ID" 
echo "   AZURE_SUBSCRIPTION_ID: $AZURE_SUBSCRIPTION_ID"
echo ""
echo "🌐 GitHub repository settings:"
echo "   https://github.com/$GITHUB_REPO/settings/secrets/actions"
echo ""
echo "🚀 Your GitHub Actions can now deploy to Azure!"
