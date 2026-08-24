import { useState, useEffect } from 'react';
import { Cpu, Package, CreditCard, LifeBuoy, AlertTriangle } from 'lucide-react';
import type { AgentInfo } from '../types';

export default function Agents() {
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/agents')
      .then(res => res.json())
      .then(json => {
        if (json.success) {
          setAgents(json.data);
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const getIconForAgent = (type: string) => {
    switch (type) {
      case 'ROUTER': return <Cpu size={24} />;
      case 'ORDER': return <Package size={24} />;
      case 'BILLING': return <CreditCard size={24} />;
      case 'SUPPORT': return <LifeBuoy size={24} />;
      default: return <AlertTriangle size={24} />;
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div className="page-header">
        <h1 className="page-title">Agent Directory</h1>
        <p className="page-subtitle">Explore the capabilities of our autonomous specialized agents</p>
      </div>
      
      {loading ? (
        <div style={{ padding: '40px', color: 'var(--text-muted)' }}>Loading agent definitions...</div>
      ) : (
        <div className="agents-grid">
          {agents.map((agent) => (
            <div key={agent.type} className="agent-card glass-panel">
              <div className="agent-icon">
                {getIconForAgent(agent.type)}
              </div>
              <h2 className="agent-name">{agent.name}</h2>
              <p className="agent-desc">{agent.description}</p>
              
              <div className="agent-caps">
                {agent.capabilities.map((cap, i) => (
                  <span key={i} className="agent-cap">{cap}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
