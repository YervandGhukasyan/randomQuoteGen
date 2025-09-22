# Deployment Guide

Quick guide to deploy this thing to Azure.

## Prerequisites

- Azure CLI (`az login`)
- Terraform installed
- Docker (for local testing)

## Local Development

```bash
# regular development
npm run dev

# test with docker
./scripts/local-docker.sh
```

## Deployment

### Quick Deploy

```bash
# deploy to dev environment
./scripts/deploy.sh dev

# deploy to production
./scripts/deploy.sh prod
```

### Manual Steps

1. **Infrastructure (Terraform)**
   ```bash
   cd terraform
   cp terraform.tfvars.example terraform.tfvars
   # edit terraform.tfvars with your values
   
   terraform init
   terraform plan
   terraform apply
   ```

2. **App Deployment**
   ```bash
   npm run build
   
   # zip and deploy
   zip -r app.zip dist/ package.json node_modules/
   az webapp deployment source config-zip --src app.zip --resource-group <rg-name> --name <app-name>
   ```

## Environments

- **dev** - Basic App Service, cheap
- **staging** - Same as prod but smaller
- **prod** - Premium App Service with monitoring

## Monitoring

- Application Insights is set up automatically
- Health check endpoint: `/health`
- Logs: `az webapp log tail --resource-group <rg> --name <app>`

## Troubleshooting

**Docker build fails with Python errors?**
- `better-sqlite3` needs Python to compile native code
- The main Dockerfile installs build dependencies automatically
- If still having issues, try `Dockerfile.alternative` (slower but no native deps)

**App won't start?**
- Check environment variables in Azure portal
- Look at App Service logs
- Make sure PORT is set to 8000 (not 3000)

**Database issues?**
- SQLite runs in `/tmp` - not persistent!
- For production, you'd want Azure SQL or Cosmos DB
- Data gets wiped on app restart (feature, not bug 😅)

**Terraform fails?**
- Make sure you're logged into Azure
- Resource names might conflict - check the random suffix
- Some regions don't support all SKUs
