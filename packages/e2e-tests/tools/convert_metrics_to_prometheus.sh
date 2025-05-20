#!/bin/bash

set -euo pipefail

JOB=${1:-}
INSTANCE=${2:-}
METRICS_DIR=${3:-metrics}

if [[ -z "$JOB" || -z "$INSTANCE" ]]; then
  echo "Usage: $0 <job> <instance> [metrics_dir]"
  echo "  job         - GitHub workflow name"
  echo "  instance    - GitHub run ID"
  echo "  metrics_dir - (optional) Directory containing JSON metrics files (default: metrics)"
  exit 1
fi

OUTPUT_FILE="$METRICS_DIR/prometheus.txt"

if [[ ! -d "$METRICS_DIR" ]]; then
  echo "Metrics directory '$METRICS_DIR' does not exist."
  exit 0
fi

shopt -s nullglob
FILES=("$METRICS_DIR"/*.json)

# Filter out the output file from being processed
FILES=("${FILES[@]/$OUTPUT_FILE}")

if [[ ${#FILES[@]} -eq 0 ]]; then
  echo "No JSON files found in '$METRICS_DIR'."
  exit 0
fi

> "$OUTPUT_FILE"

for file in "${FILES[@]}"; do
  if [[ ! -s "$file" ]]; then
    echo "Skipping empty file: $file"
    continue
  fi

  filename=$(basename "$file")
  scenario_id="${filename%%-chrome-usage.json}"
  scenario_name=$(jq -r '.scenarioName // empty' "$file")
  data_length=$(jq '.data | length' "$file")

  echo "# Metrics from $filename" >> "$OUTPUT_FILE"

  if [[ "$data_length" -eq 0 ]]; then
    echo "e2e_cpu_seconds_total{scenario_name=\"$scenario_name\",scenario_id=\"$scenario_id\",job=\"$JOB\",instance=\"$INSTANCE\"} 0" >> "$OUTPUT_FILE"
    echo "e2e_memory_rss_bytes{scenario_name=\"$scenario_name\",scenario_id=\"$scenario_id\",job=\"$JOB\",instance=\"$INSTANCE\"} 0" >> "$OUTPUT_FILE"
  else
    jq -c '.data[]' "$file" | while read -r entry; do
      timestamp=$(echo "$entry" | jq -r '.timestamp')
      cpu=$(echo "$entry" | jq -r '.cpu')
      memory=$(echo "$entry" | jq -r '.memory')

      echo "e2e_cpu_seconds_total{scenario_name=\"$scenario_name\",scenario_id=\"$scenario_id\",job=\"$JOB\",instance=\"$INSTANCE\",timestamp=\"$timestamp\"} $cpu" >> "$OUTPUT_FILE"
      echo "e2e_memory_rss_bytes{scenario_name=\"$scenario_name\",scenario_id=\"$scenario_id\",job=\"$JOB\",instance=\"$INSTANCE\",timestamp=\"$timestamp\"} $memory" >> "$OUTPUT_FILE"
    done
  fi
done

echo "Metrics converted to Prometheus format: $OUTPUT_FILE"
