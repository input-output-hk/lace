# Debugging Datadog CI Metrics Issue

## Current Status Check

### 1. Verify Workflow Files
- ✅ `ci-with-datadog.yml` exists and has datadog integration
- ✅ `datadog-ci.yml` exists as reusable workflow
- ❓ **Main issue**: Regular `ci.yml` might still be running instead

### 2. Check GitHub Secrets
Go to: `https://github.com/input-output-hk/lace/settings/secrets/actions`

Verify these secrets exist:
- `DATADOG_API_KEY` - Your Datadog API key
- Other required secrets for the workflow

### 3. Test API Key Locally
```bash
# Set your API key (replace with actual key)
export DATADOG_API_KEY=your_api_key_here

# Run the test script
./test-datadog.sh
```

### 4. Check Workflow Triggers
The `ci-with-datadog.yml` should trigger on:
- ✅ `test/**` branches (your current branch: `test/berno_prom_metrics`)
- ✅ Pull requests
- ✅ Manual dispatch

### 5. Force Workflow to Run
To test if the workflow works:

1. **Option A**: Rename the workflow file
   ```bash
   git mv .github/workflows/ci.yml .github/workflows/ci-backup.yml
   git mv .github/workflows/ci-with-datadog.yml .github/workflows/ci.yml
   ```

2. **Option B**: Manual trigger
   - Go to GitHub Actions tab
   - Select "Continuous Integration with Datadog"
   - Click "Run workflow"

### 6. Check Workflow Logs
Look for these messages in the workflow logs:
- ✅ "Sending metrics to Datadog..."
- ✅ "Datadog API response: 202"
- ❌ "No DATADOG_API_KEY provided, skipping metrics"
- ❌ "Failed to send metric to Datadog"

## Common Issues & Solutions

### Issue: "No DATADOG_API_KEY provided"
**Solution**: Add the secret to GitHub repository settings

### Issue: "Failed to send metric to Datadog"
**Solution**: Check API key validity and Datadog account status

### Issue: Workflow not running
**Solution**: Ensure branch name matches trigger conditions

### Issue: Wrong workflow running
**Solution**: Rename files to prioritize datadog workflow

## Next Steps

1. **Test your API key** using the test script
2. **Check GitHub secrets** are properly configured
3. **Force the datadog workflow** to run
4. **Monitor the logs** for success/error messages
5. **Check Datadog dashboard** for incoming metrics

## Expected Success Indicators

- ✅ Workflow runs and shows "Sending metrics to Datadog..."
- ✅ API response shows HTTP 202
- ✅ Metrics appear in Datadog dashboard within 5-10 minutes
- ✅ Events appear in Datadog Events section 