from fastapi import FastAPI, HTTPException
from kubernetes import client, config
from pydantic import BaseModel
import subprocess
import json

app = FastAPI()

# Load kube config (assumes running locally or inside a pod with access)
try:
    config.load_kube_config()
except:
    config.load_incluster_config()

v1 = client.CoreV1Api()

class AnalyzeRequest(BaseModel):
    pod_name: str
    namespace: str

@app.get("/pods")
def get_pods():
    healthy = []
    unhealthy = []

    try:
       # pods = v1.list_pod_for_all_namespaces()
        pods = v1.list_namespaced_pod(namespace="app")
        for pod in pods.items:
            pod_name = pod.metadata.name
            namespace = pod.metadata.namespace
            conditions = pod.status.conditions or []
            is_ready = any(c.type == "Ready" and c.status == "True" for c in conditions)

            pod_info = {"name": pod_name, "namespace": namespace}
            (healthy if is_ready else unhealthy).append(pod_info)

        return {"healthy": healthy, "unhealthy": unhealthy}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze")
def analyze_pod(pod_request: AnalyzeRequest):
    command = [
        "k8sgpt",
        "analyze",
        "--namespace", pod_request.namespace,
        "--explain",
        "--output", "json"
    ]

    print("Running command:", " ".join(command))

    result = subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)

    if result.returncode != 0:
        raise HTTPException(status_code=500, detail=result.stderr)

    raw_output = result.stdout.strip()
    print("Raw k8sgpt output:", raw_output)

    try:
        analysis = json.loads(raw_output)
    except json.JSONDecodeError:
        return {
            "error": "Failed to parse k8sgpt output as JSON",
            "raw_output": raw_output
        }

    # If analysis is a string, wrap it
    if isinstance(analysis, str):
        return {
            "pod": pod_request.pod_name,
            "analysis": analysis
        }

    # If analysis is a list of dicts, filter by pod name
    if isinstance(analysis, list):
        filtered_output = [item for item in analysis if pod_request.pod_name in item.get("name", "")]
    else:
        filtered_output = analysis  # fallback

    return {
        "pod": pod_request.pod_name,
        "analysis": filtered_output or "No analysis found for the pod"
    }
