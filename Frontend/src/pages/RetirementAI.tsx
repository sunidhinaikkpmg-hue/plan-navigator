import React, { useState, useRef, useEffect } from "react";
import { Send, ExternalLink, Loader2, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface Source {
  title: string;
  uri: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
}

export const RetirementAI: React.FC = () => {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat history when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userQuestion = input.trim();
    setMessages((prev) => [...prev, { role: "user", content: userQuestion }]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/rag/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: userQuestion }),
      });

      if (!response.ok) throw new Error("Knowledge base request failed");

      const data = await response.json();
      
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: data.answer,
        sources: data.sources
      }]);
    } catch (error) {
      console.error("RetirementAI Error:", error);
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: "I'm sorry, I encountered an error while searching the retirement knowledge base. Please try again later."
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="ai-page-shell">
      <main className="chat-container">
        <header className="chat-header">
          <div>
            <h1>Retirement AI</h1>
            <p className="subtitle">Grounded in plan documents & regulations</p>
          </div>
        </header>

        <section className="chat-panel">
          <div ref={scrollRef} className="messages">
            {messages.length === 0 && (
              <div className="message-row assistant">
                <div className="message-bubble">
                  <span>Welcome to Retirement AI. Ask me anything about your plan, documents, or employer matching rules.</span>
                </div>
              </div>
            )}
            {messages.map((message, i) => (
              <div
                key={i}
                className={`message-row ${message.role === "assistant" ? "assistant" : "user"}`}
              >
                <div className="message-bubble">
                  <div className="markdown-content">
                    <ReactMarkdown>
                      {message.content}
                    </ReactMarkdown>
                  </div>
                  
                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-gray-700/50 flex flex-col gap-2">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Cited Sources</span>
                      <div className="flex flex-wrap gap-2">
                        {message.sources.map((source, idx) => (
                          <a 
                            key={idx}
                            href={source.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-white/5 border border-white/10 rounded-md text-[11px] text-gray-300 hover:bg-white/10 transition-colors"
                          >
                            {source.title} <ExternalLink size={10} />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="message-row assistant">
                <div className="message-bubble">
                  <div className="loading-row">
                    <Loader2 size={16} className="spinner" />
                    <span className="loading-text">Analyzing documents...</span>
                  </div>
                </div>
              </div>
            )}</div>

          <div className="chat-input-row">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend())}
              placeholder="Ask a question about your retirement plan..."
            />
            <button type="button" onClick={handleSend} disabled={isLoading || !input.trim()}>
              <Send size={18} />
            </button>
          </div>
        </section>
      </main>

      <style>{`
        .ai-page-shell {
          display: flex;
          height: 100vh;
          background: #03172f;
          color: #ffffff;
          font-family: Inter, system-ui, sans-serif;
        }

        .chat-container {
          flex: 1;
          padding: 28px 36px 24px;
          display: flex;
          flex-direction: column;
          gap: 18px;
          overflow: hidden;
          min-height: 0;
        }

        .chat-header {
          display: flex;
          justify-content: space-between;
          gap: 20px;
          align-items: flex-start;
        }

        .chat-header h1 {
          margin: 0;
          font-size: clamp(2rem, 2.5vw, 2.4rem);
          letter-spacing: -0.03em;
          color: #ffffff;
        }

        .subtitle {
          margin: 4px 0 0;
          color: #cbd5e1;
          line-height: 1.5;
          font-size: 0.95rem;
        }

        .info-card {
          background: #ffffff;
          border-radius: 28px;
          padding: 24px 28px;
          margin-bottom: 8px;
          border: 1px solid rgba(0,0,0,0.02);
        }

        .info-title {
          margin: 0 0 10px;
          font-size: 1.05rem;
          font-weight: 700;
          color: #0f172a;
        }

        .info-body {
          margin: 0;
          line-height: 1.6;
          color: #475569;
          font-size: 0.95rem;
        }

        .documents {
          margin-top: 18px;
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .doc-link {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          background: #f1f5f9;
          border-radius: 12px;
          color: #334155;
          text-decoration: none;
          font-size: 0.85rem;
          border: 1px solid #e2e8f0;
          transition: all 0.2s;
        }

        .doc-link:hover {
          background: #e2e8f0;
          border-color: #cbd5e1;
        }

        .chat-panel {
          flex: 1;
          background: #041a33;
          border-radius: 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          overflow: hidden;
          min-height: 0;
        }

        .messages {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 18px;
          overflow-y: auto;
          padding: 24px 24px 0;
          scroll-behavior: smooth;
          min-height: 0;
          scrollbar-width: thin;
          scrollbar-color: rgba(255,255,255,0.14) transparent;
        }

        .message-row {
          display: flex;
        }

        .message-row.assistant {
          justify-content: flex-start;
        }

        .message-row.user {
          justify-content: flex-end;
        }

        .message-bubble {
          max-width: 80%;
          padding: 16px 22px;
          border-radius: 24px;
          font-size: 1rem;
          letter-spacing: 0.01em;
          color: #ffffff;
          background: #2563eb;
        }

        .message-row.assistant .message-bubble {
          background: #1e40af;
          border-bottom-left-radius: 6px;
        }

        .message-row.user .message-bubble {
          background: #3b82f6;
          border-bottom-right-radius: 6px;
        }

        .message-bubble,
        .message-bubble * {
          color: inherit !important;
        }

        .markdown-content {
          line-height: 1.65;
        }

        .markdown-content p:not(:last-child) {
          margin-bottom: 0.95rem;
        }

        .markdown-content strong {
          color: #ffffff;
          font-weight: 700;
        }

        .markdown-content ul,
        .markdown-content ol {
          margin: 0.75rem 0;
          padding-left: 1.25rem;
        }

        .markdown-content li {
          margin-bottom: 0.4rem;
        }

        .loading-row {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          color: #ffffff;
        }

        .loading-text {
          opacity: 0.85;
          font-size: 0.95rem;
        }

        .spinner {
          animation: spin 1s linear infinite;
          color: #ffffff;
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .chat-input-row {
          position: relative;
          display: block;
          padding-top: 12px;
        }

        .chat-input-row input {
          width: 100%;
          border: 1px solid rgba(255,255,255,0.14);
          border-radius: 24px;
          padding: 18px 72px 18px 20px;
          font-size: 1rem;
          background: #062843;
          color: #ffffff;
          outline: none;
        }

        .chat-input-row input:focus {
          background: #0b3959;
          border-color: #4f8ae8;
        }

        .chat-input-row input::placeholder {
          color: rgba(255,255,255,0.55);
        }

        .chat-input-row button {
          position: absolute;
          right: 5px;
          top: 58%;
          transform: translateY(-50%);
          border: none;
          border-radius: 50%;
          width: 52px;
          height: 52px;
          display: grid;
          place-items: center;
          background: #3b82f6;
          color: #ffffff;
          cursor: pointer;
        }

        .chat-input-row button:hover:not(:disabled) {
          background: #2563eb;
        }

        .chat-input-row button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};