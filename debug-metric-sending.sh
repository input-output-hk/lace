#!/bin/bash

# Comprehensive debugging for Datadog metrics
echo "🔍 Debugging Datadog Metric Sending..."

if [ -z "$DATADOG_API_KEY" ]; then
    echo "❌ DATADOG_API_KEY not set"
    exit 1
fi

echo "✅ Using API Key: ${DATADOG_API_KEY:0:8}..."

# Test 1: Simple metric with minimal data
echo ""
echo "📊 Test 1: Simple metric..."
response1=$(curl -s -w "%{http_code}" -X POST "https://api.datadoghq.com/api/v1/series" \
  -H "Content-Type: application/json" \
  -H "DD-API-KEY: $DATADOG_API_KEY" \
  -d '{
    "series": [{
      "metric": "test.simple",
      "points": [[$(date +%s), 1]],
      "type": "gauge"
    }]
  }')

http_code1="${response1: -3}"
response_body1="${response1%???}"

echo "HTTP Code: $http_code1"
echo "Response: $response_body1"

# Test 2: Metric with tags
echo ""
echo "📊 Test 2: Metric with tags..."
response2=$(curl -s -w "%{http_code}" -X POST "https://api.datadoghq.com/api/v1/series" \
  -H "Content-Type: application/json" \
  -H "DD-API-KEY: $DATADOG_API_KEY" \
  -d '{
    "series": [{
      "metric": "test.with.tags",
      "points": [[$(date +%s), 2]],
      "tags": ["test:true"],
      "type": "gauge"
    }]
  }')

http_code2="${response2: -3}"
response_body2="${response2%???}"

echo "HTTP Code: $http_code2"
echo "Response: $response_body2"

# Test 3: Metric with service tag
echo ""
echo "📊 Test 3: Metric with service tag..."
response3=$(curl -s -w "%{http_code}" -X POST "https://api.datadoghq.com/api/v1/series" \
  -H "Content-Type: application/json" \
  -H "DD-API-KEY: $DATADOG_API_KEY" \
  -d '{
    "series": [{
      "metric": "test.service",
      "points": [[$(date +%s), 3]],
      "tags": ["service:test-service"],
      "type": "gauge"
    }]
  }')

http_code3="${response3: -3}"
response_body3="${response3%???}"

echo "HTTP Code: $http_code3"
echo "Response: $response_body3"

# Test 4: Check API key validity
echo ""
echo "🔑 Test 4: Checking API key validity..."
validate_response=$(curl -s -w "%{http_code}" -X GET "https://api.datadoghq.com/api/v1/validate" \
  -H "DD-API-KEY: $DATADOG_API_KEY")

validate_http_code="${validate_response: -3}"
validate_response_body="${validate_response%???}"

echo "HTTP Code: $validate_http_code"
echo "Response: $validate_response_body"

# Test 5: Check organization info
echo ""
echo "🏢 Test 5: Checking organization info..."
org_response=$(curl -s -w "%{http_code}" -X GET "https://api.datadoghq.com/api/v1/org" \
  -H "DD-API-KEY: $DATADOG_API_KEY")

org_http_code="${org_response: -3}"
org_response_body="${org_response%???}"

echo "HTTP Code: $org_http_code"
echo "Response: $org_response_body"

# Summary
echo ""
echo "📊 SUMMARY:"
echo "Test 1 (Simple): $([ "$http_code1" = "202" ] && echo "✅" || echo "❌")"
echo "Test 2 (Tags): $([ "$http_code2" = "202" ] && echo "✅" || echo "❌")"
echo "Test 3 (Service): $([ "$http_code3" = "202" ] && echo "✅" || echo "❌")"
echo "API Key Valid: $([ "$validate_http_code" = "200" ] && echo "✅" || echo "❌")"
echo "Org Info: $([ "$org_http_code" = "200" ] && echo "✅" || echo "❌")"

echo ""
echo "🔍 Next Steps:"
echo "1. Check if you see 'test.simple' in Datadog Metrics Explorer"
echo "2. Check if you see 'test.with.tags' in Datadog Metrics Explorer"
echo "3. Check if you see 'test.service' in Datadog Metrics Explorer"
echo "4. Wait 5-10 minutes for metrics to appear"
echo "5. Make sure you're looking at 'Last 1 hour' time range" 