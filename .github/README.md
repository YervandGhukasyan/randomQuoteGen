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
AZURE_CREDENTIALS     # Azure service principal credentials
SNYK_TOKEN           # Snyk API token (optional)
```

### Azure Credentials Format
```json
{
  "clientId": "your-client-id",
  "clientSecret": "your-client-secret", 
  "subscriptionId": "your-subscription-id",
  "tenantId": "your-tenant-id"
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
- Make sure tests pass locally
- Verify Docker builds locally

**Deployment failing?**
- Check Azure credentials are valid
- Verify Terraform state isn't corrupted
- Make sure resource names don't conflict

**Security scan issues?**
- Update vulnerable dependencies
- Check Snyk token is valid
- Review CodeQL findings in Security tab
