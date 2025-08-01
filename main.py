from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from kubernetes import client, config
from pydantic import BaseModel
import subprocess
import json
from collections import Counter

app = FastAPI()

# Load Kubernetes config (local or in-cluster)
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
        pods = v1.list_namespaced_pod(namespace="app")  # You can change this to a parameter if needed
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

    # Define responsibility classifier
    def classify_responsibility(text: str) -> str:
        text = text.lower()
        if any(word in text for word in ["image", "readiness", "liveness", "probe", "http", "container", "crash", "application", "404"]):
            return "Developer"
        elif any(word in text for word in ["node", "network", "quota", "scheduler", "affinity", "taint", "resource", "rbac", "permission", "oomkilled"]):
            return "DevOps"
        return "Unknown"

    responsibility_counter = Counter()

    if isinstance(analysis, dict) and 'results' in analysis and isinstance(analysis['results'], list):
        for item in analysis['results']:
            # Combine all error texts and details for this result
            error_texts = ' '.join(err.get('Text', '') for err in item.get('error', []))
            details = item.get('details', '')
            combined_text = error_texts + ' ' + details
            responsibility = classify_responsibility(combined_text)
            item['responsibility'] = responsibility
            responsibility_counter[responsibility] += 1
        filtered_output = analysis
    else:
        filtered_output = {
            "message": "No valid results found in k8sgpt output",
            "raw_analysis": analysis
        }

    return {
        "pod": pod_request.pod_name,
        "analysis": filtered_output,
        "responsibility_summary": dict(responsibility_counter)
    }

@app.post("/run_kubectl")
async def run_kubectl(request: Request):
    data = await request.json()
    command = data.get("command", "")
    if not command.strip().startswith("kubectl "):
        return JSONResponse({"error": "Only kubectl commands are allowed."}, status_code=400)
    try:
        result = subprocess.run(command, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=30)
        if result.returncode == 0:
            return {"output": result.stdout.strip()}
        else:
            return {"error": result.stderr.strip() or "Unknown error"}
    except Exception as e:
        return {"error": str(e)}
