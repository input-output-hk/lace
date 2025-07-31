#!/bin/bash

echo "🔍 Finding your Datadog site..."

if [ -z "$DATADOG_API_KEY" ]; then
    echo "❌ DATADOG_API_KEY not set"
    exit 1
fi

echo "✅ Using API Key: ${DATADOG_API_KEY:0:8}..."

# Test different Datadog sites
sites=("datadoghq.com" "us3.datadoghq.com" "us5.datadoghq.com" "ap1.datadoghq.com" "datadoghq.eu")

for site in "${sites[@]}"; do
    echo ""
    echo "🌐 Testing site: $site"
    
    # Test metrics endpoint
    response=$(curl -s -w "%{http_code}" -X POST "https://api.$site/api/v1/series" \
      -H "Content-Type: application/json" \
      -H "DD-API-KEY: $DATADOG_API_KEY" \
      -d '{
        "series": [{
          "metric": "test.site.check",
          "points": [[$(date +%s), 1]],
          "tags": ["site:'$site'"],
          "type": "gauge"
        }]
      }')
    
    http_code="${response: -3}"
    response_body="${response%???}"
    
    echo "HTTP Code: $http_code"
    echo "Response: $response_body"
    
    if [ "$http_code" = "202" ]; then
        echo "✅ SUCCESS! This API key works with $site"
        echo ""
        echo "🎯 Go to: https://app.$site"
        echo "📊 Look for metric: test.site.check"
        echo "🏷️  Filter by tag: site:$site"
        break
    else
        echo "❌ Failed with $site"
    fi
done

echo ""
echo "🔍 If none of the sites work, try:"
echo "1. Check your Datadog account settings"
echo "2. Verify the API key is for the correct organization"
echo "3. Contact your Datadog admin" 