import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import HealOpsPanel from './HealOpsPanel';
import './HealOpsPanel.css';

const assistantAvatar = "🤖";
const userAvatar = "🧑‍💻";

// Main App component for the DevOps Chatbot
const App = () => {
  // State to store the chat history
  const [chatHistory, setChatHistory] = useState([]);
  // State to store the current user input
  const [userInput, setUserInput] = useState("");
  // State to manage loading indicator during API calls
  const [isLoading, setIsLoading] = useState(false);
  // Ref for auto-scrolling to the latest message
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const [expandedIndexes, setExpandedIndexes] = useState({});
  const [darkMode, setDarkMode] = useState(false);
  const [terminalInput, setTerminalInput] = useState("");
  const [terminalOutput, setTerminalOutput] = useState("");
  const [terminalLoading, setTerminalLoading] = useState(false);

  // Scroll to the bottom of the chat history whenever it updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  // Listen for Ask GPT events from HealOpsPanel
  useEffect(() => {
    function handleHealopsToGpt(event) {
      if (event.data && event.data.type === 'HEALOPS_TO_GPT') {
        const appended = event.data.payload + '\n\nProvide me solution along with exact commands to fix this issue.';
        setUserInput(appended);
        setTimeout(() => {
          inputRef.current?.focus();
          // Automatically send the message
          setTimeout(() => {
            sendMessage();
          }, 0);
        }, 0);
      }
    }
    window.addEventListener('message', handleHealopsToGpt);
    return () => window.removeEventListener('message', handleHealopsToGpt);
  }, []);

  // Send message using AWS Bedrock
  const sendMessage = async () => {
    if (!userInput.trim()) return;
    setIsLoading(true);

    // Add user message to chat
    setChatHistory((prev) => [
      ...prev,
      { role: "user", text: userInput }
    ]);

    try {
      // Prepare messages for Bedrock API
      const messages = [
        { role: "system", content: "You are a DevOps expert. Give concise, step-by-step Kubernetes/EKS troubleshooting answers with commands and short explanations." },
        ...chatHistory.map(m => ({ role: m.role === "user" ? "user" : "assistant", content: m.text })),
        { role: "user", content: userInput }
      ];

      // Call our Bedrock backend API
      const response = await fetch("http://localhost:8001/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: messages,
          model: "anthropic.claude-3-sonnet-20240229-v1:0",
          max_tokens: 500,
          temperature: 0.3
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.response) {
        setChatHistory((prev) => [
          ...prev,
          { role: "model", text: data.response }
        ]);
      } else {
        setChatHistory((prev) => [
          ...prev,
          { role: "model", text: "Sorry, I couldn't generate a response." }
        ]);
      }
    } catch (err) {
      console.error("Error calling Bedrock API:", err);
      setChatHistory((prev) => [
        ...prev,
        { role: "model", text: "❌ Error: Unable to fetch answer. Please check if the backend server is running and AWS credentials are configured." }
      ]);
    }

    setUserInput("");
    setIsLoading(false);
  };

  const runKubectlCommand = async () => {
    if (!terminalInput.trim()) return;
    setTerminalLoading(true);
    setTerminalOutput("");
    try {
      const res = await fetch('/run_kubectl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: terminalInput })
      });
      const data = await res.json();
      setTerminalOutput(data.output || data.error || JSON.stringify(data));
    } catch (err) {
      setTerminalOutput("Error running command: " + String(err));
    }
    setTerminalLoading(false);
  };

  // Handle Enter key press in the input field
  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !isLoading) {
      sendMessage();
    }
  };

  return (
    <div className={`${darkMode ? "dark" : ""} h-screen w-screen bg-gradient-to-br from-blue-100 via-white to-purple-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 font-sans flex`}>
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-gradient-to-b from-blue-700 to-purple-700 text-white py-8 px-6 shadow-lg">
        <div className="flex items-center gap-3 mb-8">
          <span className="text-3xl">⚡</span>
          <span className="text-2xl font-bold tracking-tight">HealOps GPT</span>
        </div>
        <button
          className="mb-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded transition"
          onClick={() => setChatHistory([])}
        >
          + New Chat
        </button>
        <button
          className="mb-8 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded transition"
          onClick={() => {
            const blob = new Blob(
              [chatHistory.map(m => `${m.role === "user" ? "You" : "Assistant"}:\n${m.text}\n`).join("\n")],
              { type: "text/plain" }
            );
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "devops-gpt-chat.txt";
            a.click();
            URL.revokeObjectURL(url);
          }}
          disabled={chatHistory.length === 0}
        >
          💾 Save Chat
        </button>
        <nav className="flex flex-col gap-4 mt-8">
          <span className="opacity-70">Kubernetes Troubleshooting</span>
          {/* Add more nav items here */}
        </nav>
      </aside>
      {/* Main Content Split */}
      <div className="flex-1 flex flex-row h-screen">
        {/* Left: HealOps Panel */}
        <div style={{ width: '40%', borderRight: '2px solid #e5e7eb', background: '#f8fafc', overflowY: 'auto' }}>
          <HealOpsPanel />
        </div>
        {/* Right: DevOps GPT Chat */}
        <div className="flex-1 flex flex-col" style={{ maxWidth: '60%' }}>
          {/* Header */}
          <header className="sticky top-0 z-10 py-5 px-8 bg-gradient-to-r from-purple-600 via-pink-500 to-red-400 text-white shadow flex items-center justify-between">
            <div>
              <p className="text-base opacity-90">Kubernetes Troubleshooting Assistant</p>
            </div>
            <button
              className="bg-white/20 hover:bg-white/40 text-white px-3 py-1 rounded-full transition"
              onClick={() => setDarkMode((d) => !d)}
              aria-label="Toggle dark mode"
            >
              {darkMode ? "🌙 Dark" : "☀️ Light"}
            </button>
          </header>

          {/* Chat area */}
          <div className="flex-1 overflow-y-auto px-4 md:px-12 py-6 space-y-4 flex flex-col bg-white/70 dark:bg-gray-900/80 custom-scrollbar">
            {chatHistory.length === 0 && (
              <div className="text-center text-gray-400 italic mt-10">
                Type your Kubernetes or pod issue below, e.g., <span className="font-mono">"Why is my pod CrashLoopBackOff?"</span>
              </div>
            )}
            {chatHistory.map((msg, index) => (
              <div key={index} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role !== "user" && (
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center text-2xl shadow">{assistantAvatar}</div>
                )}
                <div
                  className={`max-w-[75%] px-5 py-4 mb-2 rounded-2xl shadow-md transition-all group ${
                    msg.role === "user"
                      ? "bg-gradient-to-br from-blue-500 to-blue-400 text-white rounded-br-md"
                      : "bg-gradient-to-br from-gray-100 to-purple-100 text-gray-900 border border-gray-200 rounded-bl-md dark:from-gray-800 dark:to-gray-700 dark:text-gray-100 dark:border-gray-700"
                  }`}
                  style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
                >
                  <div className="font-semibold text-xs mb-1 opacity-70 flex items-center gap-2">
                    {msg.role === "user" ? (
                      <>
                        <span className="hidden md:inline">{userAvatar}</span> You
                      </>
                    ) : (
                      <>
                        <span className="hidden md:inline">{assistantAvatar}</span> Assistant
                      </>
                    )}
                  </div>
                  <div>
                    {msg.text.length > 500 ? (
                      <>
                        <div>
                          {expandedIndexes[index] ? (
                            <ReactMarkdown
                              components={{
                                code({ node, inline, className, children, ...props }) {
                                  return !inline ? (
                                    <SyntaxHighlighter style={oneDark} language="bash" PreTag="div" {...props}>
                                      {String(children).replace(/\n$/, "")}
                                    </SyntaxHighlighter>
                                  ) : (
                                    <code className={className} {...props}>{children}</code>
                                  );
                                },
                              }}
                            >
                              {msg.text}
                            </ReactMarkdown>
                          ) : (
                            <ReactMarkdown>{msg.text.slice(0, 500) + "..."}</ReactMarkdown>
                          )}
                        </div>
                        <button
                          onClick={() => setExpandedIndexes((prev) => ({ ...prev, [index]: !prev[index] }))}
                          className="text-blue-500 underline text-xs"
                        >
                          {expandedIndexes[index] ? "Show less" : "Show more"}
                        </button>
                      </>
                    ) : (
                      <ReactMarkdown
                        components={{
                          code({ node, inline, className, children, ...props }) {
                            return !inline ? (
                              <SyntaxHighlighter style={oneDark} language="bash" PreTag="div" {...props}>
                                {String(children).replace(/\n$/, "")}
                              </SyntaxHighlighter>
                            ) : (
                              <code className={className} {...props}>{children}</code>
                            );
                          },
                        }}
                      >
                        {msg.text}
                      </ReactMarkdown>
                    )}
                  </div>
                </div>
                {msg.role === "user" && (
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-2xl shadow">{userAvatar}</div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-center my-4">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  <span className="text-blue-600 font-semibold">Assistant is typing…</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Example buttons */}
          <div className="sticky bottom-24 md:bottom-24 px-4 md:px-12 pb-2 pt-2 flex flex-wrap gap-2 bg-white/80 border-t border-gray-100 z-10">
            {[
              "Pod is Pending: How do I debug why my EKS pod won't start?",
              "Pod CrashLoopBackOff: What are the top things to check?",
              "How do I get logs for a failing pod in EKS?",
              "How do I check if my EKS cluster networking is healthy?",
              "How do I verify IAM roles for service accounts in EKS?",
              "How do I see which node a pod is running on?",
              "How do I check if my EKS nodes are out of IPs?",
              "How do I debug DNS issues in my EKS pods?",
              "How do I restart a stuck pod in EKS?",
            ].map((example) => (
              <button
                key={example}
                className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full hover:bg-blue-200 text-xs transition shadow"
                onClick={() => {
                  setUserInput(example);
                  setTimeout(() => inputRef.current?.focus(), 0);
                }}
                disabled={isLoading}
              >
                {example}
              </button>
            ))}
          </div>

          {/* Input area */}
          <form
            className="sticky bottom-0 z-20 flex items-center gap-2 px-4 md:px-12 py-4 bg-white/90 border-t border-gray-200"
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
          >
            <input
              ref={inputRef}
              type="text"
              className="flex-1 p-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-sm transition"
              placeholder="Describe your Kubernetes problem..."
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={handleKeyPress}
              disabled={isLoading}
            />
            <button
              className={`px-6 py-3 bg-blue-600 text-white font-bold rounded-full hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 transition shadow ${
                isLoading ? "opacity-50 cursor-not-allowed" : ""
              }`}
              type="submit"
              disabled={isLoading}
            >
              Send
            </button>
            <button
              className="ml-2 px-4 py-2 bg-gray-200 rounded-full hover:bg-gray-300 text-xs font-semibold shadow"
              type="button"
              onClick={() => setChatHistory([])}
              disabled={isLoading}
            >
              Clear
            </button>
          </form>

          <div style={{ margin: '0', paddingBottom: '1rem', background: '#e0f2fe', borderRadius: '0.7rem', color: '#18181b', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            <div style={{ fontWeight: 700, marginBottom: '0.5rem', fontSize: '1.1rem', color: '#2563eb' }}>Cluster Terminal</div>
            <form
              onSubmit={e => { e.preventDefault(); runKubectlCommand(); }}
              style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}
            >
              <input
                type="text"
                value={terminalInput}
                onChange={e => setTerminalInput(e.target.value)}
                placeholder="kubectl ..."
                style={{ flex: 1, padding: '0.5rem 1rem', borderRadius: '0.4rem', border: 'none', fontSize: '1rem', color: '#18181b', background: '#fff' }}
                disabled={terminalLoading}
              />
              <button
                type="submit"
                style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '0.4rem', padding: '0.5rem 1.2rem', fontWeight: 700, fontSize: '1rem', cursor: 'pointer', boxShadow: '0 1px 4px rgba(59,130,246,0.08)' }}
                disabled={terminalLoading}
              >
                {terminalLoading ? 'Running...' : 'Run'}
              </button>
              <button
                type="button"
                style={{ background: '#e0f2fe', color: '#2563eb', border: 'none', borderRadius: '0.4rem', padding: '0.5rem 1.2rem', fontWeight: 700, fontSize: '1rem', cursor: 'pointer', boxShadow: '0 1px 4px rgba(59,130,246,0.04)' }}
                onClick={() => setTerminalOutput("")}
                disabled={terminalLoading && !terminalOutput}
              >
                Clear
              </button>
            </form>
            {terminalOutput && (
              <pre style={{ background: '#f0f9ff', color: '#2563eb', borderRadius: '0.4rem', padding: '1rem', marginTop: '1rem', fontSize: '0.97rem', whiteSpace: 'pre-wrap', border: '1px solid #bae6fd', maxHeight: '250px', overflowY: 'auto' }}>{terminalOutput}</pre>
            )}
          </div>
        </div>
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          background: #e0e7ef;
          border-radius: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #a5b4fc;
          border-radius: 8px;
        }
      `}</style>
    </div>
  );
};

export default App;
