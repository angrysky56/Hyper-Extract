import React, { useState, useEffect, useRef } from 'react';
import type { 
  TemplateCfg, 
  AppConfig, 
  KARecord, 
  TaskRecord, 
  KAData 
} from './types';
import { ForceGraph } from './components/ForceGraph';
import { LogConsole } from './components/LogConsole';

// Premium Inline SVGs for Sidebar Icons
const Icons = {
  Dashboard: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>
  ),
  Extract: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v18M3 12h18M5 19 19 5"/></svg>
  ),
  Config: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
  ),
  Explorer: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m16.2 7.8-2 2-2 2-2 2 4-4Z"/><path d="M12 2v2M12 20v2M20 12h2M2 12h2"/></svg>
  ),
  Terminal: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
  ),
  Info: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
  ),
  Search: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
  ),
  Chat: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
  )
};

const API_BASE = ''; // Relative path, routes to FastAPI server

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'extract' | 'config' | 'explorer'>('dashboard');
  
  // App states
  const [configs, setConfigs] = useState<AppConfig | null>(null);
  const [templates, setTemplates] = useState<TemplateCfg[]>([]);
  const [kas, setKas] = useState<KARecord[]>([]);
  const [activeKA, setActiveKA] = useState<KAData | null>(null);
  const [activeTask, setActiveTask] = useState<TaskRecord | null>(null);

  // Filter templates
  const [templateFilter, setTemplateFilter] = useState({ query: '', domain: 'all', type: 'all' });
  
  // Extraction Form state
  const [extractionForm, setExtractionForm] = useState({
    inputText: '',
    outputPath: '',
    template: 'general/graph',
    language: 'en',
    noIndex: false,
  });

  // explorer states
  const [explorerTab, setExplorerTab] = useState<'visualizer' | 'collections' | 'chat'>('visualizer');
  
  // visualizer attributes
  const [timelineIndex, setTimelineIndex] = useState<number>(0);
  const [timelineValues, setTimelineValues] = useState<string[]>([]);
  const [spatialLocked, setSpatialLocked] = useState<boolean>(false);
  const [hypergraphMode, setHypergraphMode] = useState<boolean>(false);

  // Search/Chat sidebar state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchHits, setSearchHits] = useState<string[]>([]);
  
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{ role: 'user' | 'assistant', content: string }>>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [retrievedNodes, setRetrievedNodes] = useState<string[]>([]);

  // Task Poller
  const pollerRef = useRef<number | null>(null);

  // ==================== Initial Fetch ====================

  useEffect(() => {
    fetchConfigs();
    fetchTemplates();
    fetchKAs();
    
    // Scan folder placeholder for output
    const defaultOutput = './output_' + Math.floor(Math.random() * 1000);
    setExtractionForm(prev => ({ ...prev, outputPath: defaultOutput }));
  }, []);

  // Cleanup poller
  useEffect(() => {
    return () => {
      if (pollerRef.current) clearInterval(pollerRef.current);
    };
  }, []);

  const fetchConfigs = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/config`);
      const data = await res.json();
      setConfigs(data);
    } catch (err) {
      console.error('Failed to fetch config', err);
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/templates`);
      const data = await res.json();
      setTemplates(data);
    } catch (err) {
      console.error('Failed to fetch templates', err);
    }
  };

  const fetchKAs = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/ka/list`);
      const data = await res.json();
      setKas(data);
    } catch (err) {
      console.error('Failed to fetch KAs', err);
    }
  };

  const loadKADetails = async (path: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/ka/data?path=${encodeURIComponent(path)}`);
      if (!res.ok) throw new Error('Failed to load abstract details');
      const data: KAData = await res.json();
      setActiveKA(data);
      
      // Analyze graph time values if it is a temporal graph
      const nodesList = data.data.nodes || [];
      const edgesList = data.data.edges || [];
      
      // Collect unique times
      const timesSet = new Set<string>();
      nodesList.forEach((n: any) => { if (n.time) timesSet.add(String(n.time)); });
      edgesList.forEach((e: any) => { if (e.time) timesSet.add(String(e.time)); });
      
      const sortedTimes = Array.from(timesSet).sort();
      setTimelineValues(sortedTimes);
      setTimelineIndex(sortedTimes.length > 0 ? sortedTimes.length - 1 : 0);
      
      // Auto-detect hypergraph
      const isHg = data.metadata?.template?.includes('hypergraph') || data.metadata?.template?.includes('narrative');
      setHypergraphMode(!!isHg);

      // Auto-detect spatial
      const isSp = data.metadata?.template?.includes('spatial') || data.metadata?.template?.includes('map');
      setSpatialLocked(!!isSp);
      
      // Reset chat & searches
      setChatHistory([]);
      setSearchQuery('');
      setSearchHits([]);
      setRetrievedNodes([]);
      
      setActiveTab('explorer');
      setExplorerTab('visualizer');
    } catch (err) {
      alert(`Error loading Knowledge Abstract: ${(err as Error).message}`);
    }
  };

  // ==================== Config Update Helpers ====================

  const updateLLM = async (updated: Partial<AppConfig['llm']>) => {
    try {
      const res = await fetch(`${API_BASE}/api/config/llm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      if (res.ok) fetchConfigs();
    } catch (err) {
      alert('Failed to update LLM configuration');
    }
  };

  const updateEmbedder = async (updated: Partial<AppConfig['embedder']>) => {
    try {
      const res = await fetch(`${API_BASE}/api/config/embedder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      if (res.ok) fetchConfigs();
    } catch (err) {
      alert('Failed to update Embedder configuration');
    }
  };

  // ==================== Task Poller Handler ====================

  const pollTask = async (taskId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/tasks/${taskId}`);
      if (!res.ok) return;
      const data: TaskRecord = await res.json();
      setActiveTask(data);

      if (data.status !== 'running') {
        // Stop Poller
        if (pollerRef.current) {
          clearInterval(pollerRef.current);
          pollerRef.current = null;
        }
        
        // Refresh KAs
        fetchKAs();
        
        // If success, auto-load details
        if (data.status === 'success') {
          setTimeout(() => {
            loadKADetails(data.output_path);
          }, 1000);
        }
      }
    } catch (err) {
      console.error('Error polling task', err);
    }
  };

  const startPolling = (taskId: string) => {
    if (pollerRef.current) clearInterval(pollerRef.current);
    
    // Check immediately
    pollTask(taskId);
    
    // Check every 1.5 seconds
    pollerRef.current = window.setInterval(() => {
      pollTask(taskId);
    }, 1500);
  };

  // ==================== Form Submissions ====================

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const path = prompt('Enter absolute directory path to Knowledge Abstract:');
    if (!path) return;
    try {
      const res = await fetch(`${API_BASE}/api/ka/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path })
      });
      if (res.ok) {
        fetchKAs();
      } else {
        const err = await res.json();
        alert(err.detail || 'Failed to register path');
      }
    } catch (err) {
      alert('Error connecting to backend');
    }
  };

  const handleRemove = async (path: string) => {
    if (!confirm('Are you sure you want to remove this Knowledge Abstract from the UI directory? (Your files will NOT be deleted)')) return;
    try {
      const res = await fetch(`${API_BASE}/api/ka/remove?path=${encodeURIComponent(path)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchKAs();
        if (activeKA?.path === path) setActiveKA(null);
      }
    } catch (err) {
      alert('Error removing KA');
    }
  };

  const triggerExtraction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!extractionForm.inputText) {
      alert('Please enter document text to extract knowledge.');
      return;
    }
    
    try {
      const res = await fetch(`${API_BASE}/api/ka/parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input_text: extractionForm.inputText,
          output_path: extractionForm.outputPath,
          template: extractionForm.template,
          language: extractionForm.language,
          no_index: extractionForm.noIndex,
          force: true // overwrite always for clean ui run
        })
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.detail || 'Failed to trigger parse');
        return;
      }

      const { task_id } = await res.json();
      
      // Reset progress & open logs console
      setActiveTab('extract');
      startPolling(task_id);
    } catch (err) {
      alert('Error triggering extraction');
    }
  };

  const triggerFeed = async () => {
    if (!activeKA) return;
    const text = prompt('Enter document content to append incrementally to this KA:');
    if (!text) return;

    try {
      const res = await fetch(`${API_BASE}/api/ka/feed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: activeKA.path,
          input_text: text
        })
      });

      if (!res.ok) throw new Error('Append failed');
      const { task_id } = await res.json();
      setActiveTab('extract');
      startPolling(task_id);
    } catch (err) {
      alert(`Error appending knowledge: ${(err as Error).message}`);
    }
  };

  const triggerIndexBuild = async () => {
    if (!activeKA) return;
    try {
      const res = await fetch(`${API_BASE}/api/ka/build-index`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: activeKA.path,
          force: true
        })
      });
      if (!res.ok) throw new Error('Index build failed');
      const { task_id } = await res.json();
      setActiveTab('extract');
      startPolling(task_id);
    } catch (err) {
      alert(`Error building index: ${(err as Error).message}`);
    }
  };

  // ==================== Semantic Explorer Search / Chat ====================

  const runSearch = async () => {
    if (!activeKA || !searchQuery) return;
    try {
      const res = await fetch(`${API_BASE}/api/ka/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: activeKA.path,
          query: searchQuery,
          top_k: 4
        })
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.detail || 'Search failed');
        return;
      }
      const data = await res.json();
      const results = data.results;

      // Extract node IDs from results to highlight
      const hits: string[] = [];
      if (results.nodes) {
        results.nodes.forEach((n: any) => hits.push(n.name || n.id));
      } else if (Array.isArray(results)) {
        // Scalar collections
        results.forEach((item: any) => {
          if (item.name) hits.push(item.name);
          else if (item.title) hits.push(item.title);
        });
      }
      setSearchHits(hits);
    } catch (err) {
      alert('Error running semantic search');
    }
  };

  const sendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeKA || !chatInput.trim() || isChatLoading) return;

    const userMsg = chatInput.trim();
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsChatLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/ka/talk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: activeKA.path,
          query: userMsg,
          top_k: 3
        })
      });

      if (!res.ok) throw new Error('Failed to get answer');
      const data = await res.json();

      setChatHistory(prev => [...prev, { role: 'assistant', content: data.answer }]);
      
      // Store returned nodes for glow rings
      const highlightIds = [
        ...data.retrieved_nodes.map((n: any) => n.name || n.id),
        ...data.retrieved_items.map((i: any) => i.name || i.title || i.id).filter(Boolean)
      ];
      setRetrievedNodes(highlightIds);

    } catch (err) {
      setChatHistory(prev => [...prev, { role: 'assistant', content: `Error: ${(err as Error).message}` }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // ==================== Render Filtering ====================

  const filteredTemplates = templates.filter(t => {
    const qMatch = !templateFilter.query || 
                   t.name.toLowerCase().includes(templateFilter.query.toLowerCase()) || 
                   t.id.toLowerCase().includes(templateFilter.query.toLowerCase()) ||
                   t.description_zh.toLowerCase().includes(templateFilter.query.toLowerCase()) ||
                   t.description_en.toLowerCase().includes(templateFilter.query.toLowerCase());

    const domMatch = templateFilter.domain === 'all' || t.id.startsWith(templateFilter.domain);
    const typeMatch = templateFilter.type === 'all' || t.type === templateFilter.type;

    return qMatch && domMatch && typeMatch;
  });

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <div className="sidebar">
        <div className="logo-container">
          <div className="logo-icon">
            <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <span className="logo-text">Hyper-Extract</span>
          <span className="logo-badge">PRO</span>
        </div>

        <div className="nav-menu">
          <div 
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <Icons.Dashboard /> Dashboard
          </div>
          
          <div 
            className={`nav-item ${activeTab === 'extract' ? 'active' : ''}`}
            onClick={() => setActiveTab('extract')}
          >
            <Icons.Extract /> Extraction Suite
          </div>

          <div 
            className={`nav-item ${activeTab === 'config' ? 'active' : ''}`}
            onClick={() => setActiveTab('config')}
          >
            <Icons.Config /> Configuration
          </div>

          {activeKA && (
            <div 
              className={`nav-item ${activeTab === 'explorer' ? 'active' : ''}`}
              onClick={() => setActiveTab('explorer')}
              style={{ marginTop: '24px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px' }}
            >
              <Icons.Explorer /> Explore: {activeKA.name}
            </div>
          )}
        </div>

        {/* System Health Status */}
        <div style={{ marginTop: 'auto', padding: '12px', background: 'rgba(0,0,0,0.15)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255,255,255,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
            <span style={{ width: '8px', height: '8px', background: 'var(--success)', borderRadius: '50%', boxShadow: '0 0 8px var(--success)' }} />
            <span style={{ fontWeight: 500, color: '#f3f4f6' }}>Backend Connected</span>
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-dark)', marginTop: '4px' }}>
            Localhost running on port 8000
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="main-content">
        
        {/* ==================== 1. Dashboard Tab ==================== */}
        {activeTab === 'dashboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h1 style={{ fontSize: '28px', marginBottom: '6px' }}>Dashboard</h1>
                <p style={{ color: 'var(--text-muted)' }}>Manage extracted knowledge abstracts and import directories.</p>
              </div>
              <button className="btn btn-primary" onClick={handleRegister}>
                + Import Directory
              </button>
            </div>

            {/* KAs list */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Registered Knowledge Abstracts</h3>
              
              {kas.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-dark)' }}>
                  No Knowledge Abstracts found. Run extraction or register a directory to begin.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {kas.map(ka => (
                    <div 
                      key={ka.path} 
                      className="glass-panel glass-panel-hover" 
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        padding: '16px 20px',
                        cursor: 'pointer'
                      }}
                      onClick={() => loadKADetails(ka.path)}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontWeight: 600, fontSize: '16px' }}>{ka.name}</span>
                          <span className="badge badge-primary">{ka.template}</span>
                          <span className="badge badge-secondary">{ka.lang}</span>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-dark)', marginTop: '6px', fontFamily: 'monospace' }}>
                          {ka.path}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '14px', fontWeight: 500 }}>
                            {ka.node_count} nodes · {ka.edge_count} edges
                          </div>
                          {ka.updated_at && (
                            <div style={{ fontSize: '11px', color: 'var(--text-dark)', marginTop: '4px' }}>
                              Updated {new Date(ka.updated_at).toLocaleDateString()}
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }} onClick={e => e.stopPropagation()}>
                          <button className="btn btn-secondary" style={{ padding: '8px 12px' }} onClick={() => loadKADetails(ka.path)}>
                            Explore
                          </button>
                          <button className="btn btn-danger" style={{ padding: '8px' }} onClick={() => handleRemove(ka.path)}>
                            ✕
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick stats / info cards */}
            <div className="grid-3">
              <div className="glass-panel" style={{ padding: '20px' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '13px', textTransform: 'uppercase' }}>Total Abstracts</div>
                <div style={{ fontSize: '32px', fontWeight: 700, margin: '8px 0', color: 'var(--primary)' }}>{kas.length}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-dark)' }}>Loaded into memory</div>
              </div>
              <div className="glass-panel" style={{ padding: '20px' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '13px', textTransform: 'uppercase' }}>Available Templates</div>
                <div style={{ fontSize: '32px', fontWeight: 700, margin: '8px 0', color: 'var(--secondary)' }}>{templates.length}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-dark)' }}>6 domains supported</div>
              </div>
              <div className="glass-panel" style={{ padding: '20px' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '13px', textTransform: 'uppercase' }}>Active Task</div>
                <div style={{ fontSize: '32px', fontWeight: 700, margin: '8px 0', color: activeTask?.status === 'running' ? '#00f0ff' : 'var(--text-muted)' }}>
                  {activeTask?.status === 'running' ? 'Running' : 'Idle'}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-dark)' }}>
                  {activeTask ? activeTask.progress : 'No tasks running'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== 2. Extraction Suite Tab ==================== */}
        {activeTab === 'extract' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px', height: '100%', overflow: 'hidden' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%', overflowY: 'auto' }}>
              <div>
                <h1 style={{ fontSize: '28px', marginBottom: '6px' }}>Knowledge Extraction Suite</h1>
                <p style={{ color: 'var(--text-muted)' }}>Extract structured graphs or models from unstructured documents using templates.</p>
              </div>

              {/* Console log display if a task is active/running */}
              {activeTask && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontWeight: 600 }}>Task ID: {activeTask.id.substring(0, 8)}...</span>
                        <span className={`badge ${activeTask.status === 'running' ? 'badge-primary spinner' : activeTask.status === 'success' ? 'badge-success' : 'badge-danger'}`}>
                          {activeTask.status}
                        </span>
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        {activeTask.progress}
                      </div>
                    </div>
                    {activeTask.status === 'running' && (
                      <div style={{ width: '40px', height: '40px' }} className="spinner">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ color: '#00f0ff' }}>
                          <path d="M21 12a9 9 0 0 1-9 9m9-9a9 9 0 0 0-9-9"/>
                        </svg>
                      </div>
                    )}
                  </div>
                  <LogConsole logs={activeTask.logs} height="280px" isCompleted={activeTask.status !== 'running'} />
                </div>
              )}

              {/* Extraction Input Form */}
              <form onSubmit={triggerExtraction} className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ fontSize: '18px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
                  New Knowledge Abstract Job
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>Source Text Document</label>
                  <textarea 
                    rows={8}
                    placeholder="Paste your source document content here (e.g. news reports, research papers, biographies, financial transcripts)..."
                    value={extractionForm.inputText}
                    onChange={e => setExtractionForm(prev => ({ ...prev, inputText: e.target.value }))}
                    style={{ resize: 'vertical' }}
                  />
                </div>

                <div className="grid-2">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>Target Output Folder Path</label>
                    <input 
                      type="text" 
                      placeholder="./output_directory"
                      value={extractionForm.outputPath}
                      onChange={e => setExtractionForm(prev => ({ ...prev, outputPath: e.target.value }))}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>Target Language</label>
                    <select
                      value={extractionForm.language}
                      onChange={e => setExtractionForm(prev => ({ ...prev, language: e.target.value }))}
                    >
                      <option value="en">English (en)</option>
                      <option value="zh">Chinese (zh)</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                  <input 
                    type="checkbox" 
                    id="noIndex"
                    checked={extractionForm.noIndex}
                    onChange={e => setExtractionForm(prev => ({ ...prev, noIndex: e.target.checked }))}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <label htmlFor="noIndex" style={{ fontSize: '14px', cursor: 'pointer', userSelect: 'none' }}>
                    Skip building vector search index (Index is required for Semantic Explorer Search & Chat)
                  </label>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                  <button type="submit" className="btn btn-primary" style={{ flexGrow: 1 }} disabled={activeTask?.status === 'running'}>
                    🚀 Run Extraction
                  </button>
                </div>
              </form>
            </div>

            {/* Right sidebar: template selector grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', overflow: 'hidden' }}>
              <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
                <h4 style={{ fontSize: '15px', textTransform: 'uppercase', color: 'var(--text-muted)', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
                  Select Template
                </h4>

                <input 
                  type="text" 
                  placeholder="Search templates..."
                  value={templateFilter.query}
                  onChange={e => setTemplateFilter(prev => ({ ...prev, query: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', fontSize: '13px' }}
                />

                <div style={{ display: 'flex', gap: '6px' }}>
                  <select 
                    value={templateFilter.domain}
                    onChange={e => setTemplateFilter(prev => ({ ...prev, domain: e.target.value }))}
                    style={{ flexGrow: 1, padding: '6px', fontSize: '12px' }}
                  >
                    <option value="all">All Domains</option>
                    <option value="general">General</option>
                    <option value="finance">Finance</option>
                    <option value="legal">Legal</option>
                    <option value="medicine">Medicine</option>
                    <option value="tcm">TCM</option>
                    <option value="industry">Industry</option>
                  </select>

                  <select
                    value={templateFilter.type}
                    onChange={e => setTemplateFilter(prev => ({ ...prev, type: e.target.value }))}
                    style={{ flexGrow: 1, padding: '6px', fontSize: '12px' }}
                  >
                    <option value="all">All Types</option>
                    <option value="graph">Graph</option>
                    <option value="hypergraph">Hypergraph</option>
                    <option value="list">List</option>
                    <option value="set">Set</option>
                    <option value="model">Model</option>
                  </select>
                </div>

                {/* Templates list scrolling */}
                <div style={{ flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {filteredTemplates.map(t => (
                    <div 
                      key={t.id}
                      className={`glass-panel ${extractionForm.template === t.id ? 'active' : ''}`}
                      style={{ 
                        padding: '10px 12px', 
                        cursor: 'pointer',
                        borderColor: extractionForm.template === t.id ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                        background: extractionForm.template === t.id ? 'rgba(0, 240, 255, 0.04)' : 'rgba(0,0,0,0.1)'
                      }}
                      onClick={() => setExtractionForm(prev => ({ ...prev, template: t.id }))}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: extractionForm.template === t.id ? 'var(--primary)' : '#fff' }}>
                          {t.name}
                        </span>
                        <span style={{ fontSize: '10px', padding: '1px 5px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>
                          {t.type}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-dark)', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {t.id}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== 3. Config Manager Tab ==================== */}
        {activeTab === 'config' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%', overflowY: 'auto' }}>
            <div>
              <h1 style={{ fontSize: '28px', marginBottom: '6px' }}>System Configuration</h1>
              <p style={{ color: 'var(--text-muted)' }}>Configure credentials, API base URLs, and active models for LLM and Embedder engines.</p>
            </div>

            {!configs ? (
              <div style={{ padding: '40px', textAlign: 'center' }} className="spinner">
                Loading configuration...
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* LLM Card */}
                <div className="glass-panel" style={{ padding: '24px' }}>
                  <div className="card-header">
                    <h3 style={{ fontSize: '18px', color: 'var(--primary)' }}>Large Language Model (LLM)</h3>
                    <span className="badge badge-primary">{configs.llm.provider || 'custom'}</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginTop: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>Provider Preset</label>
                      <select 
                        value={configs.llm.provider} 
                        onChange={e => updateLLM({ provider: e.target.value })}
                      >
                        <option value="openai">OpenAI</option>
                        <option value="bailian">Aliyun Bailian</option>
                        <option value="vllm">Local vLLM</option>
                        <option value="custom">Custom Endpoint</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>Model Name</label>
                      <input 
                        type="text" 
                        value={configs.llm.model} 
                        onChange={e => updateLLM({ model: e.target.value })}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>API Key</label>
                      <input 
                        type="password" 
                        placeholder="••••••••••••••••"
                        value={configs.llm.api_key} 
                        onChange={e => updateLLM({ api_key: e.target.value })}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>Custom Base URL</label>
                      <input 
                        type="text" 
                        placeholder="https://api.openai.com/v1"
                        value={configs.llm.base_url} 
                        onChange={e => updateLLM({ base_url: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Embedder Card */}
                <div className="glass-panel" style={{ padding: '24px' }}>
                  <div className="card-header">
                    <h3 style={{ fontSize: '18px', color: 'var(--secondary)' }}>Text Embedding Model</h3>
                    <span className="badge badge-secondary">{configs.embedder.provider || 'custom'}</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginTop: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>Provider Preset</label>
                      <select 
                        value={configs.embedder.provider} 
                        onChange={e => updateEmbedder({ provider: e.target.value })}
                      >
                        <option value="openai">OpenAI</option>
                        <option value="bailian">Aliyun Bailian</option>
                        <option value="vllm">Local vLLM</option>
                        <option value="custom">Custom Endpoint</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>Model Name</label>
                      <input 
                        type="text" 
                        value={configs.embedder.model} 
                        onChange={e => updateEmbedder({ model: e.target.value })}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>API Key</label>
                      <input 
                        type="password" 
                        placeholder="••••••••••••••••"
                        value={configs.embedder.api_key} 
                        onChange={e => updateEmbedder({ api_key: e.target.value })}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>Custom Base URL</label>
                      <input 
                        type="text" 
                        placeholder="https://api.openai.com/v1"
                        value={configs.embedder.base_url} 
                        onChange={e => updateEmbedder({ base_url: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: '12px', color: 'var(--text-dark)', padding: '0 8px' }}>
                  ⚙️ Settings are synchronized in real-time with the local CLI config file at <code>~/.he/config.toml</code>.
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== 4. Explore/Visualizer Tab ==================== */}
        {activeTab === 'explorer' && activeKA && (
          <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px', height: '100%', overflow: 'hidden' }}>
            
            {/* Left sidebar: Search/Chat and stats */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', overflowY: 'auto' }}>
              <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h3 style={{ fontSize: '16px' }}>{activeKA.name}</h3>
                
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  <span className="badge badge-primary" style={{ fontSize: '10px' }}>{activeKA.metadata?.template}</span>
                  <span className="badge badge-secondary" style={{ fontSize: '10px' }}>{activeKA.metadata?.lang}</span>
                  {activeKA.has_index && <span className="badge badge-success" style={{ fontSize: '10px' }}>indexed</span>}
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <button className="btn btn-secondary" style={{ flexGrow: 1, padding: '8px', fontSize: '12px' }} onClick={triggerFeed}>
                    + Feed Document
                  </button>
                  <button className="btn btn-secondary" style={{ flexGrow: 1, padding: '8px', fontSize: '12px' }} onClick={triggerIndexBuild}>
                    {activeKA.has_index ? 'Rebuild Index' : 'Build Index'}
                  </button>
                </div>
              </div>

              {/* Sub-navigation tabs within Explorer */}
              <div style={{ display: 'flex', background: 'rgba(0,0,0,0.15)', borderRadius: 'var(--radius-sm)', padding: '4px' }}>
                <button 
                  className="btn" 
                  style={{ flexGrow: 1, background: explorerTab === 'visualizer' ? 'var(--bg-card)' : 'transparent', color: explorerTab === 'visualizer' ? '#fff' : 'var(--text-muted)', padding: '8px 12px', fontSize: '12px' }}
                  onClick={() => setExplorerTab('visualizer')}
                >
                  Graph View
                </button>
                <button 
                  className="btn" 
                  style={{ flexGrow: 1, background: explorerTab === 'collections' ? 'var(--bg-card)' : 'transparent', color: explorerTab === 'collections' ? '#fff' : 'var(--text-muted)', padding: '8px 12px', fontSize: '12px' }}
                  onClick={() => setExplorerTab('collections')}
                >
                  Table View
                </button>
                <button 
                  className="btn" 
                  style={{ flexGrow: 1, background: explorerTab === 'chat' ? 'var(--bg-card)' : 'transparent', color: explorerTab === 'chat' ? '#fff' : 'var(--text-muted)', padding: '8px 12px', fontSize: '12px' }}
                  onClick={() => setExplorerTab('chat')}
                >
                  RAG Chat
                </button>
              </div>

              {/* Explorer Sub-Panel details */}
              {explorerTab === 'visualizer' && (
                <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <h4 style={{ fontSize: '13px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Semantic Search</h4>
                  
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input 
                      type="text" 
                      placeholder="Search entities..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') runSearch(); }}
                      style={{ flexGrow: 1, padding: '8px', fontSize: '13px' }}
                    />
                    <button className="btn btn-primary" style={{ padding: '8px 12px' }} onClick={runSearch} disabled={!activeKA.has_index}>
                      <Icons.Search />
                    </button>
                  </div>
                  
                  {!activeKA.has_index && (
                    <div style={{ fontSize: '11px', color: 'var(--warning)' }}>
                      ⚠️ Build vector index first to enable semantic query.
                    </div>
                  )}

                  {searchHits.length > 0 && (
                    <div style={{ marginTop: '8px' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-dark)', marginBottom: '8px' }}>Matches (Glowing in Visualizer):</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '160px', overflowY: 'auto' }}>
                        {searchHits.map((h, i) => (
                          <div key={i} style={{ fontSize: '12px', padding: '6px 10px', background: 'rgba(0, 240, 255, 0.05)', borderRadius: '4px', border: '1px solid rgba(0, 240, 255, 0.15)', color: 'var(--primary)' }}>
                            {h}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {explorerTab === 'chat' && (
                <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', height: '360px' }}>
                  <h4 style={{ fontSize: '13px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Local RAG QA Chat</h4>
                  
                  <div style={{ flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px' }}>
                    {chatHistory.length === 0 ? (
                      <div style={{ color: 'var(--text-dark)', fontStyle: 'italic', fontSize: '12px', textAlign: 'center', marginTop: '20px' }}>
                        Ask questions about this Knowledge Abstract. The engine will retrieve relevant nodes as local context.
                      </div>
                    ) : (
                      chatHistory.map((chat, idx) => (
                        <div key={idx} style={{ 
                          alignSelf: chat.role === 'user' ? 'flex-end' : 'flex-start',
                          background: chat.role === 'user' ? 'rgba(0, 240, 255, 0.08)' : 'rgba(255, 255, 255, 0.04)',
                          border: chat.role === 'user' ? '1px solid rgba(0, 240, 255, 0.15)' : '1px solid rgba(255, 255, 255, 0.04)',
                          borderRadius: '8px',
                          padding: '10px 12px',
                          maxWidth: '85%',
                          fontSize: '13px',
                          lineHeight: '1.4'
                        }}>
                          <div style={{ fontSize: '10px', color: chat.role === 'user' ? 'var(--primary)' : 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 600 }}>
                            {chat.role === 'user' ? 'You' : 'Assistant'}
                          </div>
                          <div style={{ color: '#fff' }}>{chat.content}</div>
                        </div>
                      ))
                    )}
                    {isChatLoading && (
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="spinner" style={{ display: 'inline-block', width: '12px', height: '12px', border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#00f0ff', borderRadius: '50%' }} />
                        Thinking...
                      </div>
                    )}
                  </div>

                  <form onSubmit={sendChatMessage} style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                    <input 
                      type="text" 
                      placeholder="Ask the graph a question..."
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      style={{ flexGrow: 1, padding: '8px', fontSize: '12px' }}
                      disabled={isChatLoading || !activeKA.has_index}
                    />
                    <button type="submit" className="btn btn-primary" style={{ padding: '8px 12px' }} disabled={isChatLoading || !activeKA.has_index}>
                      Send
                    </button>
                  </form>
                </div>
              )}
            </div>

            {/* Right Panel: Explorer Sub-view Content */}
            <div className="glass-panel" style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
              
              {/* Explorer Tab 1: 2D Force Graph Visualizer */}
              {explorerTab === 'visualizer' && (
                <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
                  
                  {/* Visualizer Controls */}
                  <div style={{ 
                    position: 'absolute', 
                    top: '16px', 
                    right: '16px', 
                    display: 'flex', 
                    gap: '12px',
                    zIndex: 10
                  }}>
                    {/* Spatial locks toggle */}
                    {activeKA.data.nodes?.some((n: any) => n.coordinates) && (
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', background: 'rgba(15,18,26,0.85)', padding: '6px 12px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          checked={spatialLocked}
                          onChange={e => setSpatialLocked(e.target.checked)}
                          style={{ cursor: 'pointer' }}
                        />
                        Spatial Mapping
                      </label>
                    )}

                    {/* Hypergraph mode toggle */}
                    {activeKA.metadata?.template?.includes('hypergraph') && (
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', background: 'rgba(15,18,26,0.85)', padding: '6px 12px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          checked={hypergraphMode}
                          onChange={e => setHypergraphMode(e.target.checked)}
                          style={{ cursor: 'pointer' }}
                        />
                        Hypergraph view
                      </label>
                    )}
                  </div>

                  {/* Physics Visualizer Node Count status */}
                  <div style={{ position: 'absolute', top: '16px', left: '16px', zIndex: 10, background: 'rgba(15,18,26,0.85)', padding: '6px 12px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)', fontSize: '11px', color: 'var(--text-muted)' }}>
                    {activeKA.data.nodes?.length || 0} nodes · {activeKA.data.edges?.length || 0} edges
                  </div>

                  {/* Interactive Canvas Graph */}
                  <div style={{ flexGrow: 1, width: '100%', height: '100%' }}>
                    <ForceGraph 
                      nodes={activeKA.data.nodes || []}
                      edges={activeKA.data.edges || []}
                      isHypergraph={hypergraphMode}
                      isSpatial={spatialLocked}
                      currentTime={timelineValues.length > 0 ? timelineValues[timelineIndex] : null}
                      highlightedNodeIds={[...searchHits, ...retrievedNodes]}
                    />
                  </div>

                  {/* Temporal Timeline Slider */}
                  {timelineValues.length > 0 && (
                    <div style={{
                      padding: '16px 24px',
                      background: 'rgba(15, 18, 26, 0.95)',
                      borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '20px',
                      zIndex: 10
                    }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Timeline</span>
                      <input 
                        type="range" 
                        min="0" 
                        max={timelineValues.length - 1} 
                        value={timelineIndex}
                        onChange={e => setTimelineIndex(parseInt(e.target.value))}
                        style={{ flexGrow: 1, cursor: 'pointer' }}
                      />
                      <span className="badge badge-primary" style={{ padding: '6px 12px', fontSize: '12px', fontWeight: 600, fontFamily: 'monospace' }}>
                        {timelineValues[timelineIndex]}
                      </span>
                    </div>
                  )}

                </div>
              )}

              {/* Explorer Tab 2: Table / Collections Grid View */}
              {explorerTab === 'collections' && (
                <div style={{ flexGrow: 1, overflowY: 'auto', padding: '24px' }}>
                  {/* Render based on structure: Nodes list, items collection, or key-value models */}
                  {activeKA.data.nodes || activeKA.data.edges ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                      
                      {/* Nodes table */}
                      <div>
                        <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>Entities List</h3>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-muted)' }}>
                              <th style={{ padding: '8px 12px' }}>Name</th>
                              <th style={{ padding: '8px 12px' }}>Type</th>
                              <th style={{ padding: '8px 12px' }}>Description</th>
                              {activeKA.data.nodes?.[0]?.time && <th style={{ padding: '8px 12px' }}>Time</th>}
                              {activeKA.data.nodes?.[0]?.location && <th style={{ padding: '8px 12px' }}>Location</th>}
                            </tr>
                          </thead>
                          <tbody>
                            {activeKA.data.nodes?.map((n: any, idx: number) => (
                              <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                <td style={{ padding: '10px 12px', fontWeight: 600, color: '#fff' }}>{n.name}</td>
                                <td style={{ padding: '10px 12px' }}><span className="badge badge-secondary" style={{ fontSize: '10px' }}>{n.type}</span></td>
                                <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{n.description || '-'}</td>
                                {n.time && <td style={{ padding: '10px 12px', fontFamily: 'monospace' }}>{n.time}</td>}
                                {n.location && <td style={{ padding: '10px 12px' }}>{n.location}</td>}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Edges table */}
                      <div>
                        <h3 style={{ fontSize: '16px', marginBottom: '12px', marginTop: '16px' }}>Relationships List</h3>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-muted)' }}>
                              <th style={{ padding: '8px 12px' }}>Source</th>
                              <th style={{ padding: '8px 12px' }}>Relation</th>
                              <th style={{ padding: '8px 12px' }}>Target / Participants</th>
                              <th style={{ padding: '8px 12px' }}>Description</th>
                            </tr>
                          </thead>
                          <tbody>
                            {activeKA.data.edges?.map((e: any, idx: number) => (
                              <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                <td style={{ padding: '10px 12px', fontWeight: 500 }}>{e.source || '-'}</td>
                                <td style={{ padding: '10px 12px' }}><span className="badge badge-primary" style={{ fontSize: '10px' }}>{e.type}</span></td>
                                <td style={{ padding: '10px 12px', fontWeight: 500 }}>
                                  {e.target || e.participants?.join(', ') || '-'}
                                </td>
                                <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{e.description || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                    </div>
                  ) : activeKA.data.items ? (
                    // Collections items list
                    <div>
                      <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>Collection Items</h3>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-muted)' }}>
                            <th style={{ padding: '8px 12px' }}>#</th>
                            <th style={{ padding: '8px 12px' }}>Data Content</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activeKA.data.items.map((item: any, idx: number) => (
                            <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                              <td style={{ padding: '10px 12px', color: 'var(--text-dark)' }}>{idx + 1}</td>
                              <td style={{ padding: '10px 12px' }}>
                                <pre style={{ fontSize: '11px', color: '#a78bfa', background: 'rgba(0,0,0,0.15)', padding: '6px 10px', borderRadius: '4px' }}>
                                  {JSON.stringify(item, null, 2)}
                                </pre>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    // Scalar Model structure (dict)
                    <div>
                      <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>Model Properties</h3>
                      <div className="glass-panel" style={{ padding: '20px', background: 'rgba(0,0,0,0.15)' }}>
                        <pre style={{ fontSize: '12px', color: '#6ee7b7', lineHeight: '1.6' }}>
                          {JSON.stringify(activeKA.data, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
