# Datadog Metrics Guide for Lace CI

## ✅ **Good News: Your Datadog Integration is Working!**

Your API key is valid and the workflow is successfully sending both **metrics** and **events** to Datadog.

## 📊 **Metrics Being Sent**

The workflow sends these metrics to Datadog:

### 1. **CI Pipeline Metrics**
- **Metric Name**: `github.ci.pipeline.duration`
- **Tags**: `service:lace-wallet`, `env:ci`, `workflow:ci`, `job:datadog-ci`
- **Type**: Gauge
- **Description**: Duration of CI pipeline execution

- **Metric Name**: `github.ci.pipeline.status`
- **Tags**: `service:lace-wallet`, `env:ci`, `workflow:ci`, `job:datadog-ci`, `status:success/failure`
- **Type**: Gauge
- **Description**: Success/failure status of CI pipeline

### 2. **Build Metrics**
- **Metric Name**: `lace.build.packages`
- **Tags**: `service:lace-wallet`, `env:ci`, `workflow:ci`, `status:success/failure`
- **Type**: Gauge
- **Description**: Build package completion status

### 3. **Test Metrics**
- **Metric Name**: `lace.tests.unit`
- **Tags**: `service:lace-wallet`, `env:ci`, `workflow:ci`, `status:success/failure`
- **Type**: Gauge
- **Description**: Unit test execution status

### 4. **Release Metrics**
- **Metric Name**: `lace.release.package`
- **Tags**: `service:lace-wallet`, `env:ci`, `workflow:release-pkg`, `status:success/failure`
- **Type**: Gauge
- **Description**: Release package creation status

## 🔍 **How to Find These Metrics in Datadog**

### **Method 1: Metrics Explorer**
1. Go to **Metrics** → **Explorer** in Datadog
2. Search for these metric names:
   - `github.ci.pipeline.duration`
   - `github.ci.pipeline.status`
   - `lace.build.packages`
   - `lace.tests.unit`
   - `lace.release.package`

### **Method 2: Query by Service**
1. Go to **Metrics** → **Explorer**
2. Filter by: `service:lace-wallet`
3. This will show all metrics tagged with your service

### **Method 3: Query by Environment**
1. Go to **Metrics** → **Explorer**
2. Filter by: `env:ci`
3. This will show all CI-related metrics

### **Method 4: Events Section**
1. Go to **Events** in Datadog
2. Look for events with title: "Lace CI Pipeline Complete"
3. Filter by: `service:lace-wallet`

## 📈 **Sample Queries for Dashboards**

### **Pipeline Success Rate**
```
sum:github.ci.pipeline.status{status:success,service:lace-wallet} / sum:github.ci.pipeline.status{service:lace-wallet}
```

### **Average Pipeline Duration**
```
avg:github.ci.pipeline.duration{service:lace-wallet}
```

### **Build Success Rate**
```
sum:lace.build.packages{status:success,service:lace-wallet} / sum:lace.build.packages{service:lace-wallet}
```

### **Test Success Rate**
```
sum:lace.tests.unit{status:success,service:lace-wallet} / sum:lace.tests.unit{service:lace-wallet}
```

## 🚨 **Troubleshooting**

### **If you can't see metrics:**
1. **Wait 5-10 minutes** - Metrics can take time to appear
2. **Check the time range** - Make sure you're looking at recent data
3. **Verify tags** - Use the exact tag combinations listed above
4. **Check for typos** - Metric names are case-sensitive

### **If you see events but not metrics:**
1. **Check the workflow logs** - Look for "Sending metrics to Datadog..." messages
2. **Verify API responses** - Should show HTTP 202 for success
3. **Check metric names** - Use the exact names listed above

## 🎯 **Next Steps**

1. **Create a dashboard** using the sample queries above
2. **Set up alerts** for pipeline failures
3. **Monitor trends** in build and test performance
4. **Share the dashboard** with your team

## 📞 **Support**

If you still can't see the metrics:
1. Check the workflow logs for any error messages
2. Verify the metric names in the Datadog Metrics Explorer
3. Try the sample queries above
4. Contact Datadog support if needed 