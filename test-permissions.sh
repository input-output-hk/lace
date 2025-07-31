#!/bin/bash

# Test Datadog API Key Permissions
echo "🔍 Testing Datadog API Key Permissions..."

if [ -z "$DATADOG_P_API_KEY" ]; then
    echo "❌ DATADOG_P_API_KEY not set"
    echo "Please set it with: export DATADOG_P_API_KEY=your_personal_api_key_here"
    exit 1
fi

echo "✅ Using API Key: ${DATADOG_P_API_KEY:0:8}..."

# Test 1: Check if we can send metrics (this is the key test)
echo ""
echo "📊 Test 1: Can we send metrics?"
response1=$(curl -s -w "%{http_code}" -X POST "https://api.datadoghq.com/api/v1/series" \
  -H "Content-Type: application/json" \
  -H "DD-API-KEY: $DATADOG_P_API_KEY" \
  -d '{
    "series": [{
      "metric": "test.permissions.metrics",
      "points": [[$(date +%s), 1]],
      "tags": ["test:permissions"],
      "type": "gauge"
    }]
  }')

http_code1="${response1: -3}"
response_body1="${response1%???}"

echo "HTTP Code: $http_code1"
echo "Response: $response_body1"

if [ "$http_code1" = "202" ]; then
    echo "✅ SUCCESS! Can send metrics"
elif [ "$http_code1" = "403" ]; then
    echo "❌ FORBIDDEN! No permission to send metrics"
elif [ "$http_code1" = "401" ]; then
    echo "❌ UNAUTHORIZED! Invalid API key"
else
    echo "❓ UNKNOWN! HTTP $http_code1 - $response_body1"
fi

# Test 2: Check if we can read metrics
echo ""
echo "📊 Test 2: Can we read metrics?"
response2=$(curl -s -w "%{http_code}" -X GET "https://api.datadoghq.com/api/v1/query?from=$(date -d '1 hour ago' +%s)&to=$(date +%s)&query=test.permissions.metrics" \
  -H "DD-API-KEY: $DATADOG_P_API_KEY")

http_code2="${response2: -3}"
response_body2="${response2%???}"

echo "HTTP Code: $http_code2"
echo "Response: $response_body2"

if [ "$http_code2" = "200" ]; then
    echo "✅ SUCCESS! Can read metrics"
elif [ "$http_code2" = "403" ]; then
    echo "❌ FORBIDDEN! No permission to read metrics"
elif [ "$http_code2" = "401" ]; then
    echo "❌ UNAUTHORIZED! Invalid API key"
else
    echo "❓ UNKNOWN! HTTP $http_code2"
fi

# Test 3: Check if we can send events
echo ""
echo "📝 Test 3: Can we send events?"
response3=$(curl -s -w "%{http_code}" -X POST "https://api.datadoghq.com/api/v1/events" \
  -H "Content-Type: application/json" \
  -H "DD-API-KEY: $DATADOG_P_API_KEY" \
  -d '{
    "title": "Test Permissions Event",
    "text": "Testing event permissions",
    "tags": ["test:permissions"],
    "alert_type": "info"
  }')

http_code3="${response3: -3}"
response_body3="${response3%???}"

echo "HTTP Code: $http_code3"
echo "Response: $response_body3"

if [ "$http_code3" = "202" ]; then
    echo "✅ SUCCESS! Can send events"
elif [ "$http_code3" = "403" ]; then
    echo "❌ FORBIDDEN! No permission to send events"
elif [ "$http_code3" = "401" ]; then
    echo "❌ UNAUTHORIZED! Invalid API key"
else
    echo "❓ UNKNOWN! HTTP $http_code3"
fi

# Test 4: Check user info
echo ""
echo "👤 Test 4: Can we get user info?"
response4=$(curl -s -w "%{http_code}" -X GET "https://api.datadoghq.com/api/v1/user" \
  -H "DD-API-KEY: $DATADOG_P_API_KEY")

http_code4="${response4: -3}"
response_body4="${response4%???}"

echo "HTTP Code: $http_code4"
if [ "$http_code4" = "200" ]; then
    echo "✅ SUCCESS! Can get user info"
    echo "User info: $response_body4"
elif [ "$http_code4" = "403" ]; then
    echo "❌ FORBIDDEN! No permission to get user info"
elif [ "$http_code4" = "401" ]; then
    echo "❌ UNAUTHORIZED! Invalid API key"
else
    echo "❓ UNKNOWN! HTTP $http_code4"
fi

# Summary
echo ""
echo "📊 PERMISSIONS SUMMARY:"
echo "Send Metrics: $([ "$http_code1" = "202" ] && echo "✅" || echo "❌")"
echo "Read Metrics: $([ "$http_code2" = "200" ] && echo "✅" || echo "❌")"
echo "Send Events: $([ "$http_code3" = "202" ] && echo "✅" || echo "❌")"
echo "Get User Info: $([ "$http_code4" = "200" ] && echo "✅" || echo "❌")"

echo ""
echo "🎯 RECOMMENDATIONS:"
if [ "$http_code1" = "202" ]; then
    echo "✅ Your API key CAN send metrics - this is what we need!"
elif [ "$http_code1" = "403" ]; then
    echo "❌ Your API key CANNOT send metrics - you need 'metrics_write' permission"
    echo "   Contact your Datadog admin to get this permission"
elif [ "$http_code1" = "401" ]; then
    echo "❌ Invalid API key - check your key"
fi 