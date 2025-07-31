#!/bin/bash

# Test both API keys to see which one works better
echo "Testing both Datadog API keys..."

# Check if both keys are set
if [ -z "$DATADOG_API_KEY" ]; then
    echo "❌ DATADOG_API_KEY not set"
    echo "Please set it with: export DATADOG_API_KEY=your_regular_key"
    exit 1
fi

if [ -z "$DATADOG_EVENT_KEY" ]; then
    echo "❌ DATADOG_EVENT_KEY not set"
    echo "Please set it with: export DATADOG_EVENT_KEY=your_event_migration_key"
    exit 1
fi

echo "✅ Both API keys are set"

# Test 1: Regular API Key - Metrics
echo ""
echo "🔑 Testing Regular API Key (Metrics)..."
response1=$(curl -s -w "%{http_code}" -X POST "https://api.datadoghq.com/api/v1/series" \
  -H "Content-Type: application/json" \
  -H "DD-API-KEY: $DATADOG_API_KEY" \
  -d '{
    "series": [{
      "metric": "lace.test.regular_key",
      "points": [[$(date +%s), 100]],
      "tags": ["service:lace-wallet", "env:test", "key:regular"],
      "type": "gauge"
    }]
  }')

http_code1="${response1: -3}"
response_body1="${response1%???}"

echo "HTTP Status Code: $http_code1"
echo "Response: $response_body1"

if [ "$http_code1" = "202" ]; then
    echo "✅ Regular key works for metrics"
else
    echo "❌ Regular key failed for metrics"
fi

# Test 2: Event Migration Key - Metrics
echo ""
echo "🔑 Testing Event Migration Key (Metrics)..."
response2=$(curl -s -w "%{http_code}" -X POST "https://api.datadoghq.com/api/v1/series" \
  -H "Content-Type: application/json" \
  -H "DD-API-KEY: $DATADOG_EVENT_KEY" \
  -d '{
    "series": [{
      "metric": "lace.test.event_key",
      "points": [[$(date +%s), 200]],
      "tags": ["service:lace-wallet", "env:test", "key:event_migration"],
      "type": "gauge"
    }]
  }')

http_code2="${response2: -3}"
response_body2="${response2%???}"

echo "HTTP Status Code: $http_code2"
echo "Response: $response_body2"

if [ "$http_code2" = "202" ]; then
    echo "✅ Event migration key works for metrics"
else
    echo "❌ Event migration key failed for metrics"
fi

# Test 3: Regular API Key - Events
echo ""
echo "🔑 Testing Regular API Key (Events)..."
event_response1=$(curl -s -w "%{http_code}" -X POST "https://api.datadoghq.com/api/v1/events" \
  -H "Content-Type: application/json" \
  -H "DD-API-KEY: $DATADOG_API_KEY" \
  -d '{
    "title": "Test Event - Regular Key",
    "text": "Testing event sending with regular API key",
    "tags": ["service:lace-wallet", "env:test", "key:regular"],
    "alert_type": "info",
    "source_type_name": "github"
  }')

event_http_code1="${event_response1: -3}"
event_response_body1="${event_response1%???}"

echo "HTTP Status Code: $event_http_code1"
echo "Response: $event_response_body1"

if [ "$event_http_code1" = "202" ]; then
    echo "✅ Regular key works for events"
else
    echo "❌ Regular key failed for events"
fi

# Test 4: Event Migration Key - Events
echo ""
echo "🔑 Testing Event Migration Key (Events)..."
event_response2=$(curl -s -w "%{http_code}" -X POST "https://api.datadoghq.com/api/v1/events" \
  -H "Content-Type: application/json" \
  -H "DD-API-KEY: $DATADOG_EVENT_KEY" \
  -d '{
    "title": "Test Event - Event Migration Key",
    "text": "Testing event sending with event migration key",
    "tags": ["service:lace-wallet", "env:test", "key:event_migration"],
    "alert_type": "info",
    "source_type_name": "github"
  }')

event_http_code2="${event_response2: -3}"
event_response_body2="${event_response2%???}"

echo "HTTP Status Code: $event_http_code2"
echo "Response: $event_response_body2"

if [ "$event_http_code2" = "202" ]; then
    echo "✅ Event migration key works for events"
else
    echo "❌ Event migration key failed for events"
fi

# Summary
echo ""
echo "📊 SUMMARY:"
echo "Regular Key - Metrics: $([ "$http_code1" = "202" ] && echo "✅" || echo "❌")"
echo "Event Key - Metrics: $([ "$http_code2" = "202" ] && echo "✅" || echo "❌")"
echo "Regular Key - Events: $([ "$event_http_code1" = "202" ] && echo "✅" || echo "❌")"
echo "Event Key - Events: $([ "$event_http_code2" = "202" ] && echo "✅" || echo "❌")"

echo ""
echo "🎯 RECOMMENDATION:"
if [ "$http_code1" = "202" ] && [ "$event_http_code1" = "202" ]; then
    echo "Use the REGULAR API key - it works for both metrics and events"
elif [ "$http_code2" = "202" ] && [ "$event_http_code2" = "202" ]; then
    echo "Use the EVENT MIGRATION key - it works for both metrics and events"
elif [ "$http_code1" = "202" ]; then
    echo "Use the REGULAR API key for metrics, EVENT MIGRATION key for events"
elif [ "$http_code2" = "202" ]; then
    echo "Use the EVENT MIGRATION key for metrics, REGULAR API key for events"
else
    echo "❌ Neither key seems to work properly. Check your API keys."
fi 