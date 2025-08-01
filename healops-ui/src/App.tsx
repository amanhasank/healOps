import React, { useEffect, useState } from 'react';
import './App.css';

function App() {
  const [pods, setPods] = useState<{ healthy: any[]; unhealthy: any[] }>({ healthy: [], unhealthy: [] });
  const [loading, setLoading] = useState(true);
  const [analysisMap, setAnalysisMap] = useState<Record<string, any>>({});
  const [analyzingPod, setAnalyzingPod] = useState<{ name: string; namespace: string } | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetch('/pods')
      .then((res) => res.json())
      .then((data) => {
        setPods(data);
        setLoading(false);
      });
  }, []);

  function podKey(pod: { name: string; namespace: string }) {
    return `${pod.namespace}__${pod.name}`;
  }

  const handleAnalyze = async (pod: { name: string; namespace: string }) => {
    const key = podKey(pod);
    setAnalyzingPod(pod); // Always set the current pod

    if (analysisMap[key]) {
      setShowModal(true);
      return;
    }

    try {
      const res = await fetch('/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pod_name: pod.name, namespace: pod.namespace }),
      });
      const data = await res.json();
      setAnalysisMap((prev) => ({ ...prev, [key]: data }));
      setShowModal(true);
    } catch (err) {
      setAnalysisMap((prev) => ({ ...prev, [key]: { error: String(err) } }));
      setShowModal(true);
    }
  };

  const analysis = analyzingPod ? analysisMap[podKey(analyzingPod)] : null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Command copied to clipboard');
  };

  function renderMainPodIssue(analysis: any) {
    const results = analysis?.analysis?.results;
    if (!results || !Array.isArray(results)) return null;

    const podResult = results.find(
      (r: any) =>
        r.kind === 'Pod' &&
        r.name?.includes(analyzingPod?.name)
    );
    if (!podResult) return null;

    const mainError = Array.isArray(podResult.error) && podResult.error.length > 0 ? podResult.error[0].Text : null;
    const details = podResult.details?.trim();
    const responsibility = podResult.responsibility;

    return (
      <div className="main-pod-issue-block">
        <div className="main-pod-issue-title">
          Pod: <span className="main-pod-issue-name">{podResult.name}</span>
        </div>
        {mainError && <div className="main-pod-issue-error">{mainError}</div>}
        {details && (
          <div className="main-pod-issue-details">
            <strong>How to fix:</strong>
            <pre className="main-pod-issue-solution">{details}</pre>
          </div>
        )}
        {responsibility && (
          <div style={{ marginTop: '0.5em' }}>
            <strong>Responsibility:</strong>{' '}
            <span style={{
              color: responsibility === 'DevOps' ? 'green' : responsibility === 'Developer' ? 'purple' : 'gray',
              fontWeight: 'bold',
            }}>
              {responsibility}
            </span>
          </div>
        )}
      </div>
    );
  }

  function renderFixSuggestions(fixes: string[] = []) {
    if (!fixes.length) return null;

    return (
      <div className="fix-suggestions">
        <h4>Suggested Commands:</h4>
        <ul className="fix-list">
          {fixes.map((cmd, idx) => (
            <li key={idx} className="fix-item">
              <pre>{cmd}</pre>
              <button className="copy-btn" onClick={() => copyToClipboard(cmd)}>
                Copy
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  function renderExtraAnalysisInfo(analysis: any) {
    const status = analysis?.analysis?.status;
    const problems = analysis?.analysis?.problems;
    const responsibility = analysis?.responsibility;

    return (
      <div className="extra-analysis-info" style={{ marginTop: '1rem' }}>
        {status && <p><strong>Status:</strong> {status}</p>}
        {typeof problems === 'number' && <p><strong>Problems Detected:</strong> {problems}</p>}
        {responsibility && (
          <p>
            <strong>Responsibility:</strong>{' '}
            <span
              style={{
                color: responsibility === 'DevOps' ? 'green' : 'purple',
                fontWeight: 'bold',
              }}
            >
              {responsibility}
            </span>
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="app-bg">
      <h1 className="app-title">HealOps - Kubernetes AI Analyzer</h1>

      {loading ? (
        <div className="loading">Loading pods...</div>
      ) : (
        <div className="pod-sections">
          <div className="pod-card healthy">
            <h2 className="pod-section-title healthy">✅ Healthy Pods</h2>
            <ul className="pod-list">
              {(Array.isArray(pods.healthy) ? pods.healthy : []).map((pod) => (
                <li key={pod.name + pod.namespace} className="pod-list-item healthy">
                  <span className="pod-name">{pod.name}</span>
                  <span className="pod-namespace">({pod.namespace})</span>
                </li>
              ))}
              {(Array.isArray(pods.healthy) && pods.healthy.length === 0) && <li className="pod-empty">No healthy pods</li>}
            </ul>
          </div>

          <div className="pod-card unhealthy">
            <h2 className="pod-section-title unhealthy">❌ Unhealthy Pods</h2>
            <ul className="pod-list">
              {(Array.isArray(pods.unhealthy) ? pods.unhealthy : []).map((pod) => (
                <li key={pod.name + pod.namespace} className="pod-list-item unhealthy">
                  <div>
                    <span className="pod-name">{pod.name}</span>
                    <span className="pod-namespace">({pod.namespace})</span>
                  </div>
                  <button className="analyze-btn" onClick={() => handleAnalyze(pod)}>
                    Analyze
                  </button>
                </li>
              ))}
              {(Array.isArray(pods.unhealthy) && pods.unhealthy.length === 0) && <li className="pod-empty">No unhealthy pods</li>}
            </ul>
          </div>
        </div>
      )}

      {showModal && analyzingPod && (
        <div className="modal-overlay">
          <div className="modal-window">
            <button className="modal-close" onClick={() => setShowModal(false)} aria-label="Close modal">
              ×
            </button>
            <h3 className="modal-title">
              Analysis for <span className="modal-pod-name">{analyzingPod.name}</span>
            </h3>

            {!analysis ? (
              <div className="modal-loading">Analyzing...</div>
            ) : (
              <div>
                {renderMainPodIssue(analysis)}
                {renderFixSuggestions(analysis?.suggested_fixes)}
                {renderExtraAnalysisInfo(analysis)}
                <details style={{ marginTop: '1.5em' }}>
                  <summary style={{ cursor: 'pointer', color: '#2563eb', fontWeight: 600 }}>Show raw response</summary>
                  <pre className="modal-raw-response">{JSON.stringify(analysis, null, 2)}</pre>
                </details>
                {analysis.error && <div className="modal-error">Error: {analysis.error}</div>}
                {!analysis.analysis?.results?.length && !analysis.error && (
                  <div className="modal-no-issues">No issues found.</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
