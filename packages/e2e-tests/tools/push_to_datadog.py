import os
import json
import sys
import requests

DATADOG_API_KEY = os.getenv("DATADOG_API_KEY")
DD_SITE = os.getenv("DD_SITE", "us5.datadoghq.com")
headers = {
    "Content-Type": "application/json",
    "DD-API-KEY": DATADOG_API_KEY
}

if len(sys.argv) < 2:
    print("Usage: python push_to_datadog.py <metrics_dir>")
    sys.exit(1)

METRICS_DIR = sys.argv[1]

def send_to_datadog(series_batch):
    url = f"https://api.{DD_SITE}/api/v1/series"
    res = requests.post(url, headers=headers, data=json.dumps({"series": series_batch}))
    print(f"→ Sent {len(series_batch)} points. Status: {res.status_code}")
    if res.status_code >= 300:
        print(res.text)

series = []

for filename in os.listdir(METRICS_DIR):
    if filename.endswith(".json"):
        path = os.path.join(METRICS_DIR, filename)
        with open(path) as f:
            content = json.load(f)
            scenario = content["scenarioName"]
            for point in content["data"]:
                ts = int(point["timestamp"] / 1000)
                series.append({
                    "metric": "e2e.cpu_seconds_total",
                    "points": [[ts, point["cpu"]]],
                    "tags": [f"scenario:{scenario}", f"source_file:{filename}"],
                    "type": "gauge"
                })
                series.append({
                    "metric": "e2e.memory_rss_bytes",
                    "points": [[ts, point["memory"]]],
                    "tags": [f"scenario:{scenario}", f"source_file:{filename}"],
                    "type": "gauge"
                })

print(f"Uploading {len(series)} points to Datadog in chunks...")

CHUNK_SIZE = 400
for i in range(0, len(series), CHUNK_SIZE):
    chunk = series[i:i + CHUNK_SIZE]
    send_to_datadog(chunk)
