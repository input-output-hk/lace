#!/bin/bash

# Test Datadog API Key
echo "Testing Datadog API Key..."

# Check if DATADOG_API_KEY is set
if [ -z "$DATADOG_API_KEY" ]; then
    echo "❌ DATADOG_API_KEY environment variable is not set"
    echo "Please set it with: export DATADOG_API_KEY=your_api_key_here"
    exit 1
fi

echo "✅ DATADOG_API_KEY is set"

# Test API key by sending a simple metric
echo "📊 Sending test metric to Datadog..."

response=$(curl -s -w "%{http_code}" -X POST "https://api.datadoghq.com/api/v1/series" \
  -H "Content-Type: application/json" \
  -H "DD-API-KEY: $DATADOG_API_KEY" \
  -d '{
    "series": [{
      "metric": "test.lace.ci.connection",
      "points": [[$(date +%s), 1]],
      "tags": ["service:lace-wallet", "env:test", "test:api-connection"],
      "type": "gauge"
    }]
  }')

http_code="${response: -3}"
response_body="${response%???}"

echo "HTTP Status Code: $http_code"
echo "Response: $response_body"

if [ "$http_code" = "202" ]; then
    echo "✅ Success! Metric sent to Datadog"
    echo "Check your Datadog dashboard for metric: test.lace.ci.connection"
else
    echo "❌ Failed to send metric to Datadog"
    echo "HTTP Code: $http_code"
    echo "Response: $response_body"
fi

# Test events API
echo "📝 Testing Datadog Events API..."

event_response=$(curl -s -w "%{http_code}" -X POST "https://api.datadoghq.com/api/v1/events" \
  -H "Content-Type: application/json" \
  -H "DD-API-KEY: $DATADOG_API_KEY" \
  -d '{
    "title": "Lace CI Test Event",
    "text": "This is a test event from Lace CI integration",
    "tags": ["service:lace-wallet", "env:test", "test:event"],
    "alert_type": "info",
    "source_type_name": "github"
  }')

event_http_code="${event_response: -3}"
event_response_body="${event_response%???}"

echo "Events HTTP Status Code: $event_http_code"
echo "Events Response: $event_response_body"

if [ "$event_http_code" = "202" ]; then
    echo "✅ Success! Event sent to Datadog"
else
    echo "❌ Failed to send event to Datadog"
    echo "HTTP Code: $event_http_code"
    echo "Response: $event_response_body"
fi 