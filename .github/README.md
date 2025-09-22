# GitHub Actions Setup

This project uses GitHub Actions for CI/CD. Here's what each workflow does:

## Workflows

### 🔧 CI Pipeline (`ci.yml`)
- Runs on every PR and push to main/develop
- Tests on multiple Node.js versions (18.x, 20.x)
- Runs linting, tests, and builds
- Tests Docker container
- Uploads coverage to Codecov

### 🚀 Deploy (`deploy.yml`)
- Deploys to Azure on main branch pushes
- Can be triggered manually for any environment
- Requires approval for production deployments
- Uses Terraform for infrastructure
- Tests deployment after completion

### 🔒 Security (`security.yml`)
- Runs weekly and on dependency changes
- Scans for vulnerabilities with npm audit and Snyk
- CodeQL analysis for security issues
- Docker image security scanning with Trivy

### 🧹 Cleanup (`cleanup.yml`)
- Runs weekly to clean up old artifacts
- Removes workflow artifacts older than 30 days
- Cleans up old container images

### 📦 Release (`release.yml`)
- Creates releases when you push tags (v1.0.0, etc.)
- Generates changelog from git commits
- Creates release archives
- Uploads assets to GitHub releases

## Required Secrets

Add these secrets in your GitHub repository settings:

```
AZURE_CLIENT_ID        # Azure service principal client ID
AZURE_TENANT_ID        # Azure tenant ID
AZURE_SUBSCRIPTION_ID  # Azure subscription ID
SNYK_TOKEN            # Snyk API token (optional)
```

### Setting up Azure OIDC Authentication

Modern approach using OpenID Connect (more secure than client secrets):

1. **Create Azure App Registration**:
   ```bash
   az ad app create --display-name "github-actions-quote-api"
   ```

2. **Create Service Principal**:
   ```bash
   az ad sp create --id <app-id>
   ```

3. **Configure Federated Credentials**:
   ```bash
   az ad app federated-credential create \
     --id <app-id> \
     --parameters @federated-credential.json
   ```

4. **Grant Azure Permissions**:
   ```bash
   az role assignment create \
     --assignee <service-principal-id> \
     --role Contributor \
     --scope /subscriptions/<subscription-id>
   ```

### Federated Credential JSON Example
```json
{
  "name": "github-actions",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:your-username/your-repo:ref:refs/heads/main",
  "audiences": ["api://AzureADTokenExchange"]
}
```

## Environments

Set up these environments in GitHub for deployment approvals:

- `dev` - Auto-deploy, no approval needed
- `staging` - Optional approval
- `prod` - Required approval from maintainers

## Usage

### Normal Development
1. Create PR → CI runs automatically
2. Merge to main → Deploys to dev automatically
3. Manual deploy to prod when ready

### Creating Releases
```bash
git tag v1.0.0
git push origin v1.0.0
# Release workflow runs automatically
```

### Manual Deployment
1. Go to Actions tab
2. Select "Deploy to Azure" workflow  
3. Click "Run workflow"
4. Choose environment and run

## Troubleshooting

**CI failing?**
- Check Node.js version compatibility
- Make sure tests pass locally (`npm test`)
- Verify Docker builds locally
- Note: Some tests expect 500 errors (not 400) due to Fastify's routing behavior

**Deployment failing?**
- **Azure login issues?** Make sure you've set up OIDC authentication (see above)
- **Missing secrets?** Check that AZURE_CLIENT_ID, AZURE_TENANT_ID, and AZURE_SUBSCRIPTION_ID are set
- **Old credentials format?** The workflow now uses OIDC instead of client secrets
- Check Azure credentials are valid
- Verify Terraform state isn't corrupted
- Make sure resource names don't conflict

**Security scan issues?**
- Update vulnerable dependencies
- Check Snyk token is valid
- Review CodeQL findings in Security tab
