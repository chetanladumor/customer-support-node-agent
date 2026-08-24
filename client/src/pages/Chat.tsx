import { useState, useEffect, useRef } from 'react';
import { Send, Bot, User as UserIcon, Loader2, ChevronDown, ChevronRight, PenTool } from 'lucide-react';
import type { Message, ReasoningStep } from '../types';

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setInput('');
    
    // Optimistic UI update
    const tempUserMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userText,
      createdAt: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, tempUserMsg]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer DEV_TEST_USER_1' // Using our seeded test user
        },
        body: JSON.stringify({
          content: userText,
          conversationId: conversationId
        })
      });

      const json = await res.json();
      
      if (json.success) {
        setConversationId(json.data.conversationId);
        setMessages(prev => [...prev, json.data.message]);
      } else {
        console.error("API Error:", json);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chat-container">
      <div className="page-header">
        <h1 className="page-title">Support Chat</h1>
        <p className="page-subtitle">Multi-Agent Intelligence Engine</p>
      </div>

      <div className="messages-area">
        {messages.length === 0 && !isLoading && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '40px' }}>
            <Bot size={48} style={{ opacity: 0.5, marginBottom: '16px' }} />
            <p>Send a message to start the conversation.</p>
            <p style={{ fontSize: '0.8rem', marginTop: '8px' }}>Try asking about Order ORDER-1001 or our return policy.</p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`message-wrapper ${msg.role}`}>
            
            {msg.role === 'assistant' && msg.reasoningSteps && msg.reasoningSteps.length > 0 && (
              <ReasoningBlock steps={msg.reasoningSteps} />
            )}

            <div className="message-bubble">
              {msg.content}
            </div>
            
            <div className="message-meta">
              {msg.role === 'user' ? (
                <>You <UserIcon size={12} /></>
              ) : (
                <><Bot size={12} /> {msg.agentType} Agent</>
              )}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="message-wrapper ai">
            <div className="message-bubble" style={{ padding: '12px 20px' }}>
              <div className="typing-indicator">
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
              </div>
            </div>
            <div className="message-meta">
              <Loader2 size={12} className="animate-spin" /> Routing...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="input-area">
        <form onSubmit={handleSend} className="input-box">
          <input
            type="text"
            className="chat-input"
            placeholder="Ask about your orders, invoices, or our policies..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
          />
          <button type="submit" className="send-btn" disabled={!input.trim() || isLoading}>
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}

function ReasoningBlock({ steps }: { steps: ReasoningStep[] }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div style={{ marginBottom: '8px' }}>
      <button 
        className="reasoning-toggle" 
        onClick={() => setIsOpen(!isOpen)}
        title="View Agent Routing Logic"
      >
        {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <PenTool size={12} />
        {isOpen ? 'Hide AI Thoughts' : 'View AI Thoughts'}
      </button>
      
      {isOpen && (
        <div className="reasoning-container glass-panel">
          {steps.map((step, idx) => (
            <div key={step.id || idx} className="reasoning-step">
              <span style={{ color: 'var(--text-muted)' }}>[{step.stage}] </span>
              <span className="step-agent">{step.agent}: </span>
              <span>{step.thought}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
