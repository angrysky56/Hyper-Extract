import React, { useEffect, useRef } from 'react';

interface LogConsoleProps {
  logs: string[];
  height?: string;
  isCompleted?: boolean;
}

export const LogConsole: React.FC<LogConsoleProps> = ({
  logs,
  height = '200px',
  isCompleted = false,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom when logs are appended
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [logs]);

  const getLogStyle = (log: string) => {
    const text = log.toLowerCase();
    if (text.includes('error') || text.includes('failed')) {
      return { color: '#ef4444', fontWeight: 500 }; // red
    }
    if (text.includes('warning') || text.includes('warn')) {
      return { color: '#f59e0b' }; // amber
    }
    if (text.includes('success') || text.includes('completed') || text.includes('finished')) {
      return { color: '#10b981', fontWeight: 600 }; // green
    }
    if (log.startsWith('[') && log.includes(']')) {
      return { color: '#00f0ff' }; // cyan highlights for steps
    }
    return { color: 'rgba(255, 255, 255, 0.75)' };
  };

  return (
    <div 
      className="glass-panel" 
      style={{
        background: '#07090e',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        padding: '12px 16px',
        height,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div 
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '11px',
          color: 'var(--text-dark)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          paddingBottom: '8px',
          marginBottom: '8px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.03)'
        }}
      >
        <span>Engine Logs console</span>
        <span style={{ color: isCompleted ? 'var(--success)' : '#00f0ff' }}>
          {isCompleted ? '● Idle' : '● Processing'}
        </span>
      </div>

      <div 
        ref={containerRef}
        style={{
          flexGrow: 1,
          overflowY: 'auto',
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: '12px',
          lineHeight: '1.6',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}
      >
        {logs.length === 0 ? (
          <div style={{ color: 'var(--text-dark)', fontStyle: 'italic' }}>
            Console is idle. Waiting for task...
          </div>
        ) : (
          logs.map((log, index) => (
            <div key={index} style={getLogStyle(log)}>
              <span style={{ color: 'rgba(255, 255, 255, 0.15)', marginRight: '8px', userSelect: 'none' }}>
                {String(index + 1).padStart(3, '0')}
              </span>
              {log}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
