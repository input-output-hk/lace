# Datadog CI Setup for Lace Wallet

This is a simple guide to add Datadog monitoring to your Lace CI/CD pipelines.

## Quick Setup

### 1. Get Datadog API Key
1. Create account at [datadoghq.com](https://datadoghq.com) (free tier available)
2. Go to **Organization Settings** → **API Keys**
3. Create new API key named "Lace CI Integration"
4. **Important**: Ensure the key has "Metrics Write" permission

### 2. Add GitHub Secret
1. Go to your Lace repository on GitHub
2. **Settings** → **Secrets and variables** → **Actions**
3. Add new repository secret:
   - **Name**: `DATADOG_API_KEY`
   - **Value**: Your Datadog API key

### 3. Use the New Workflow
Replace your current `ci.yml` with `ci-with-datadog.yml` or add Datadog to existing workflows.

## API Integration Details

### Datadog v2 API Format
The working payload format for Datadog v2 API:

```json
{
  "series": [{
    "metric": "test.datadog.integration",
    "points": [{"timestamp": 1703123456, "value": 42}],
    "tags": ["service:lace-wallet", "env:test", "workflow:test-datadog"]
  }]
}
```

### Key Requirements
- **Timestamp**: Must be Unix timestamp (seconds since epoch)
- **Points format**: Array of `{"timestamp": X, "value": Y}` objects
- **Tags**: Array of strings in `key:value` format
- **Headers**: 
  - `Content-Type: application/json`
  - `DD-API-KEY: your-api-key`

### API Endpoint
```
POST https://api.us5.datadoghq.com/api/v2/series
```

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

## Troubleshooting

### Common Issues

1. **HTTP 403 Forbidden**
   - Check API key permissions (needs "Metrics Write")
   - Verify API key is correct
   - Ensure you're using the right Datadog site (us5.datadoghq.com)

2. **HTTP 400 Bad Request**
   - Check JSON payload format
   - Ensure timestamps are Unix timestamps (seconds, not milliseconds)
   - Verify tags are in correct format

3. **HTTP 401 Unauthorized**
   - API key is invalid or expired
   - Check if the key has proper permissions

### Testing Your Integration

Use the `test-datadog.yml` workflow to verify your setup:

1. **Manual trigger**: Go to Actions → Test Datadog v2 API → Run workflow
2. **Check logs**: Look for "✅ SUCCESS: Metrics sent successfully to Datadog!"
3. **Verify in Datadog**: 
   - Go to Metrics Explorer
   - Search for `test.datadog.integration`
   - Set time range to "Last 1 hour"
   - Look for metrics with tags: `service:lace-wallet, env:test`

### Events Testing ✅ **VERIFIED**

Events functionality has been tested and confirmed working:

1. **Run the test workflow** to create test events
2. **Check Events Explorer**: https://us5.datadoghq.com/event/explorer
3. **Search for**: "Test Datadog CI Event" or "Minimal Test"
4. **Direct URLs**: Each event includes a direct link in the logs
5. **Expected Result**: Events appear with full metadata and direct access URLs

### Debugging Tips

- The test workflow provides detailed logging
- Check HTTP status codes (202 = success)
- Validate JSON payload with `jq`
- Monitor response times for performance issues

## Files Created

1. **`.github/workflows/test-datadog.yml`** - Test workflow for Datadog integration
2. **`.github/workflows/datadog-ci.yml`** - Reusable Datadog workflow
3. **`.github/workflows/ci-with-datadog.yml`** - CI with Datadog integration
4. **`docs/datadog-setup.md`** - This guide

## Next Steps

1. **Set up your Datadog account** and API key
2. **Add the secret** to GitHub
3. **Test the integration** using the test workflow
4. **Create dashboards** using the queries above
5. **Set up alerts** for critical failures
6. **Integrate with your main CI/CD** workflows

## Support

- [Datadog CI Documentation](https://docs.datadoghq.com/continuous_integration/)
- [GitHub Actions Integration](https://github.com/DataDog/github-action-metrics)
- [Datadog v2 API Reference](https://docs.datadoghq.com/api/latest/metrics/)
