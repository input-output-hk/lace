# Datadog CI Setup for Lace Wallet

Simple guide to add Datadog monitoring to your Lace CI/CD pipelines.

## Quick Setup

### 1. Get Datadog API Key
1. Create account at [datadoghq.com](https://datadoghq.com) (free tier available)
2. Go to **Organization Settings** → **API Keys**
3. Create new API key named "Lace CI Integration"

### 2. Add GitHub Secret
1. Go to your Lace repository on GitHub
2. **Settings** → **Secrets and variables** → **Actions**
3. Add new repository secret:
   - **Name**: `DATADOG_API_KEY`
   - **Value**: Your Datadog API key

### 3. Use the New Workflow
Replace your current `ci.yml` with `ci-with-datadog.yml` or add Datadog to existing workflows.

## What You'll Get

### 📊 **One Dashboard for All Pipelines**
- **CI Pipeline**: Unit tests, builds, releases
- **E2E Tests**: Test execution and results
- **Build Pipeline**: Dev preview builds
- **Chromatic**: UI component testing
- **SonarCloud**: Code quality metrics

### 📈 **Key Metrics**
- Pipeline success/failure rates
- Job execution times
- Build performance trends
- Test coverage trends

### 🚨 **Smart Alerts**
- Pipeline failures
- Performance degradation
- Test failures
- Build time increases

## Dashboard Queries

### Pipeline Success Rate
```
sum:github.ci.pipeline.status{status:success,service:lace-wallet} / sum:github.ci.pipeline.status{service:lace-wallet}
```

### Average Job Duration
```
avg:github.ci.job.duration{service:lace-wallet} by {workflow}
```

### Build Package Metrics
```
sum:lace.build.packages{service:lace-wallet}
```

### Test Results
```
sum:lace.tests.unit{service:lace-wallet,status:success}
```

## Alerts

### High Failure Rate
```
sum:github.ci.pipeline.status{status:failure,service:lace-wallet} / sum:github.ci.pipeline.status{service:lace-wallet} > 0.1
```

### Slow Builds
```
avg:github.ci.job.duration{service:lace-wallet,workflow:ci} > 1800
```

## Files Created

1. **`.github/workflows/datadog-ci.yml`** - Reusable Datadog workflow
2. **`.github/workflows/ci-with-datadog.yml`** - CI with Datadog integration
3. **`docs/datadog-setup.md`** - This guide

## Next Steps

1. **Set up your Datadog account** and API key
2. **Add the secret** to GitHub
3. **Test the integration** with a small PR
4. **Create dashboards** using the queries above
5. **Set up alerts** for critical failures

## Support

- [Datadog CI Documentation](https://docs.datadoghq.com/continuous_integration/)
- [GitHub Actions Integration](https://github.com/DataDog/github-action-metrics) 