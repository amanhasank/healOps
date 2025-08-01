import React, { useEffect, useState } from 'react';
import './HealOpsPanel.css';

function HealOpsPanel() {
  const [pods, setPods] = useState({ healthy: [], unhealthy: [] });
  const [loading, setLoading] = useState(true);
  const [analysisMap, setAnalysisMap] = useState({});
  const [analyzingPod, setAnalyzingPod] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetch('/pods')
      .then((res) => res.json())
      .then((data) => {
        setPods(data);
        setLoading(false);
      });
  }, []);

  function podKey(pod) {
    return `${pod.namespace}__${pod.name}`;
  }

  const handleAnalyze = async (pod) => {
    const key = podKey(pod);
    setAnalyzingPod(pod);
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

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Command copied to clipboard');
  };

  function renderMainPodIssue(analysis) {
    const results = analysis?.analysis?.results;
    if (!results || !Array.isArray(results)) return null;

    const podResult = results.find(
      (r) => r.kind === 'Pod' && r.name?.includes(analyzingPod?.name)
    );
    if (!podResult) return null;

    const mainError = Array.isArray(podResult.error) && podResult.error.length > 0 ? podResult.error[0].Text : null;
    const details = podResult.details?.trim();
    const responsibility = analysis?.responsibility || podResult.responsibility;

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
        {/* {responsibility && (
          <div style={{ marginTop: '0.5em' }}>
            <strong>Responsibility:</strong>{' '}
            <span
              style={{
                color: responsibility === 'DevOps' ? 'green' : responsibility === 'Developer' ? 'purple' : 'gray',
                fontWeight: 'bold',
              }}
            >
              {responsibility}
            </span>
          </div>
        )} */}
      </div>
    );
  }

  function renderFixSuggestions(fixes = []) {
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

  function renderExtraAnalysisInfo(analysis) {
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
    <div className="app-bg" style={{ marginTop: 0, paddingTop: 0 }}>
      <div style={{
        background: 'linear-gradient(90deg, #6366f1 0%, #ec4899 100%)',
        color: '#fff',
        padding: '0.7rem 1.2rem',
        margin: '0 0 1rem 0',
        boxShadow: '0 4px 24px rgba(99,102,241,0.10)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative'
      }}>
        <span style={{ fontSize: '1.3rem', fontWeight: 700, letterSpacing: '-1px', marginRight: '0.5rem' }}>🩺</span>
        <span style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '-1px', textShadow: '0 2px 8px rgba(0,0,0,0.10)' }}>
          HealOps - Kubernetes AI Analyzer
        </span>
        <button
          onClick={() => {
            setLoading(true);
            fetch('/pods')
              .then((res) => res.json())
              .then((data) => {
                setPods(data);
                setLoading(false);
              });
          }}
          title="Refresh pods"
          style={{
            position: 'absolute',
            right: '1.2rem',
            top: '50%',
            transform: 'translateY(-50%)',
            background: '#e0f2fe',
            color: '#2563eb',
            border: 'none',
            borderRadius: '50%',
            width: '2.2rem',
            height: '2.2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: '1.3rem',
            boxShadow: '0 1px 4px rgba(59,130,246,0.08)'
          }}
        >
          &#x21bb;
        </button>
      </div>

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
                  <button
                    style={{
                      background: '#3b82f6',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '0.5em',
                      padding: '0.5em 1.2em',
                      fontWeight: 600,
                      fontSize: '1em',
                      cursor: 'pointer',
                      marginLeft: 'auto',
                      boxShadow: '0 1px 4px rgba(59,130,246,0.08)'
                    }}
                    onClick={() => handleAnalyze(pod)}
                  >
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
            {/* Always show Responsibility and Ask GPT at the top if podResult exists */}
            {(() => {
              const results = analysis?.analysis?.results;
              let podResult = null;
              if (results && Array.isArray(results)) {
                podResult = results.find(
                  (r) => r.kind === 'Pod' && r.name?.includes(analyzingPod?.name)
                );
              }
              if (podResult) {
                return (
                  <div style={{
                    background: '#f3f4f6',
                    border: '2px solid #d1d5db',
                    borderRadius: '0.75em',
                    padding: '1em',
                    marginBottom: '1.5em',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1em',
                    fontSize: '1.1em',
                    justifyContent: 'space-between',
                  }}>
                    <div>
                      <span style={{ fontWeight: 700 }}>Responsibility:</span>
                      <span style={{
                        color: podResult.responsibility === 'DevOps' ? 'green' : podResult.responsibility === 'Developer' ? 'purple' : 'gray',
                        fontWeight: 'bold',
                        fontSize: '1.1em',
                        marginLeft: '0.5em',
                      }}>{podResult.responsibility || 'Unknown'}</span>
                    </div>
                    <button
                      style={{
                        background: '#2563eb',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '0.5em',
                        padding: '0.5em 1.2em',
                        fontWeight: 600,
                        fontSize: '1em',
                        cursor: 'pointer',
                        marginLeft: 'auto',
                      }}
                      onClick={() => {
                        let content = `Pod: ${podResult.name}\nResponsibility: ${podResult.responsibility || 'Unknown'}`;
                        if (Array.isArray(podResult.error) && podResult.error.length > 0) {
                          content += `\nError: ${podResult.error[0].Text}`;
                        }
                        if (podResult.details) {
                          content += `\nHow to fix: ${podResult.details.trim()}`;
                        }
                        window.postMessage({ type: 'HEALOPS_TO_GPT', payload: content }, '*');
                        setShowModal(false);
                      }}
                    >
                      Ask GPT
                    </button>
                  </div>
                );
              }
              return null;
            })()}
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

export default HealOpsPanel;