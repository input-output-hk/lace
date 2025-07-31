#!/bin/bash

# Send a test metric that's easy to find in Datadog
echo "Sending a test metric to Datadog..."

if [ -z "$DATADOG_API_KEY" ]; then
    echo "❌ DATADOG_API_KEY not set. Please set it first:"
    echo "export DATADOG_API_KEY=your_api_key_here"
    exit 1
fi

# Send a simple test metric
response=$(curl -s -w "%{http_code}" -X POST "https://api.datadoghq.com/api/v1/series" \
  -H "Content-Type: application/json" \
  -H "DD-API-KEY: $DATADOG_API_KEY" \
  -d '{
    "series": [{
      "metric": "lace.test.metric",
      "points": [[$(date +%s), 42]],
      "tags": ["service:lace-wallet", "env:test", "test:manual"],
      "type": "gauge"
    }]
  }')

http_code="${response: -3}"
response_body="${response%???}"

echo "HTTP Status Code: $http_code"
echo "Response: $response_body"

if [ "$http_code" = "202" ]; then
    echo "✅ Success! Test metric sent to Datadog"
    echo ""
    echo "🔍 To find this metric in Datadog:"
    echo "1. Go to Metrics → Explorer"
    echo "2. Search for: lace.test.metric"
    echo "3. Or filter by: service:lace-wallet"
    echo ""
    echo "📊 Metric details:"
    echo "   Name: lace.test.metric"
    echo "   Value: 42"
    echo "   Tags: service:lace-wallet, env:test, test:manual"
    echo "   Type: gauge"
else
    echo "❌ Failed to send metric"
    echo "HTTP Code: $http_code"
    echo "Response: $response_body"
fi 