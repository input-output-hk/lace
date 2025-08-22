#!/bin/bash

set -euo pipefail

JOB=${1:-}
INSTANCE=${2:-}
METRICS_DIR=${3:-metrics}
DATADOG_API_KEY=${4:-}

if [[ -z "$JOB" || -z "$INSTANCE" ]]; then
  echo "Usage: $0 <job> <instance> [metrics_dir] [datadog_api_key]"
  echo "  job              - GitHub workflow name"
  echo "  instance         - GitHub run ID"
  echo "  metrics_dir      - (optional) Directory containing JSON metrics files (default: metrics)"
  echo "  datadog_api_key  - (optional) Datadog API key for direct sending"
  exit 1
fi

if [[ ! -d "$METRICS_DIR" ]]; then
  echo "Metrics directory '$METRICS_DIR' does not exist."
  exit 0
fi

shopt -s nullglob
FILES=("$METRICS_DIR"/*.json)

if [[ ${#FILES[@]} -eq 0 ]]; then
  echo "No JSON files found in '$METRICS_DIR'."
  exit 0
fi

# Prepare Datadog payload
TIMESTAMP=$(date +%s)
SERIES=()

for file in "${FILES[@]}"; do
  if [[ ! -s "$file" ]]; then
    echo "Skipping empty file: $file"
    continue
  fi

  # Validate JSON file
  if ! jq empty "$file" 2>/dev/null; then
    echo "Warning: Invalid JSON in $file, skipping"
    continue
  fi

  filename=$(basename "$file")
  scenario_id="${filename%%-chrome-usage.json}"
  
  # Better JSON escaping using jq
  scenario_name=$(jq -r '.scenarioName // empty' "$file" | jq -Rs . | sed 's/^"//;s/"$//')
  
  data_length=$(jq '.data | length' "$file")

  echo "Processing $filename (scenario: $scenario_name, data points: $data_length)"

  if [[ "$data_length" -eq 0 ]]; then
    # Add zero values if no data
    SERIES+=("{
      \"metric\": \"lace.e2e.cpu.seconds_total\",
      \"points\": [{\"timestamp\": $TIMESTAMP, \"value\": 0}],
      \"tags\": [\"scenario_name:$scenario_name\", \"scenario_id:$scenario_id\", \"job:$JOB\", \"instance:$INSTANCE\"]
    }")
    SERIES+=("{
      \"metric\": \"lace.e2e.memory.rss_bytes\",
      \"points\": [{\"timestamp\": $TIMESTAMP, \"value\": 0}],
      \"tags\": [\"scenario_name:$scenario_name\", \"scenario_id:$scenario_id\", \"job:$JOB\", \"instance:$INSTANCE\"]
    }")
  else
    # Process each data point - avoid subshell issues
    while IFS= read -r entry; do
      timestamp=$(echo "$entry" | jq -r '.timestamp')
      cpu=$(echo "$entry" | jq -r '.cpu')
      memory=$(echo "$entry" | jq -r '.memory')

      # Better timestamp handling
      if [[ "$timestamp" =~ ^[0-9]{10}$ ]]; then
        # 10 digits - likely Unix timestamp (seconds)
        unix_timestamp=$timestamp
      elif [[ "$timestamp" =~ ^[0-9]{13}$ ]]; then
        # 13 digits - likely Unix timestamp (milliseconds)
        unix_timestamp=$((timestamp / 1000))
      else
        # Unknown format, use current time
        unix_timestamp=$TIMESTAMP
      fi

      # Validate numeric values
      if [[ "$cpu" =~ ^[0-9]+\.?[0-9]*$ ]] && [[ "$memory" =~ ^[0-9]+\.?[0-9]*$ ]]; then
        SERIES+=("{
          \"metric\": \"lace.e2e.cpu.seconds_total\",
          \"points\": [{\"timestamp\": $unix_timestamp, \"value\": $cpu}],
          \"tags\": [\"scenario_name:$scenario_name\", \"scenario_id:$scenario_id\", \"job:$JOB\", \"instance:$INSTANCE\"]
        }")
        SERIES+=("{
          \"metric\": \"lace.e2e.memory.rss_bytes\",
          \"points\": [{\"timestamp\": $unix_timestamp, \"value\": $memory}],
          \"tags\": [\"scenario_name:$scenario_name\", \"scenario_id:$scenario_id\", \"job:$JOB\", \"instance:$INSTANCE\"]
        }")
      else
        echo "Warning: Invalid numeric values in $file (cpu: $cpu, memory: $memory)"
      fi
    done < <(jq -c '.data[]' "$file")
  fi
done

# Check if we have any metrics
if [[ ${#SERIES[@]} -eq 0 ]]; then
  echo "No valid metrics found to send"
  exit 0
fi

# Create the final payload
PAYLOAD="{
  \"series\": [$(IFS=,; echo "${SERIES[*]}")]
}"

echo "Generated Datadog payload with ${#SERIES[@]} metrics"

# Save payload to file for debugging
echo "$PAYLOAD" > "$METRICS_DIR/datadog_payload.json"
echo "Datadog payload saved to: $METRICS_DIR/datadog_payload.json"

# Send to Datadog if API key provided
if [[ -n "$DATADOG_API_KEY" ]]; then
  echo "Sending metrics to Datadog..."
  
  # Validate payload JSON
  if ! echo "$PAYLOAD" | jq empty 2>/dev/null; then
    echo "❌ ERROR: Invalid JSON payload generated"
    exit 1
  fi
  
  response=$(curl -s -w "\nHTTP_STATUS_CODE:%{http_code}\nTOTAL_TIME:%{time_total}s\n" \
    -X POST "https://api.us5.datadoghq.com/api/v2/series" \
    -H "Content-Type: application/json" \
    -H "DD-API-KEY: $DATADOG_API_KEY" \
    -d "@$METRICS_DIR/datadog_payload.json")
  
  http_code=$(echo "$response" | grep "HTTP_STATUS_CODE:" | cut -d: -f2)
  total_time=$(echo "$response" | grep "TOTAL_TIME:" | cut -d: -f2)
  response_body=$(echo "$response" | sed '/HTTP_STATUS_CODE:/d' | sed '/TOTAL_TIME:/d')
  
  echo "Datadog API Response:"
  echo "  Status: $http_code"
  echo "  Time: ${total_time}s"
  echo "  Body: $response_body"
  
  if [[ "$http_code" = "202" ]]; then
    echo "✅ SUCCESS: E2E metrics sent to Datadog!"
  else
    echo "❌ ERROR: Failed to send E2E metrics to Datadog"
    echo "  Response: $response_body"
    exit 1
  fi
else
  echo "No Datadog API key provided, metrics saved to file only"
fi 