import React, { useRef, useEffect, useState } from 'react';
import type { GraphNode, GraphEdge } from '../types';

interface ForceGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  isHypergraph?: boolean;
  isSpatial?: boolean;
  currentTime?: string | number | null; // Filter nodes/edges for temporal graphs
  highlightedNodeIds?: string[];
  highlightedEdgeKeys?: string[]; // e.g., 'source|type|target'
  onNodeClick?: (node: GraphNode) => void;
}

export const ForceGraph: React.FC<ForceGraphProps> = ({
  nodes,
  edges,
  isHypergraph = false,
  isSpatial = false,
  currentTime = null,
  highlightedNodeIds = [],
  highlightedEdgeKeys = [],
  onNodeClick,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Viewport state
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<any | null>(null);
  
  // Internal physics nodes and edges
  const simNodesRef = useRef<any[]>([]);
  const simLinksRef = useRef<any[]>([]);
  const dragNodeRef = useRef<any | null>(null);
  const isDraggingCanvasRef = useRef<boolean>(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const canvasStartRef = useRef({ x: 0, y: 0 });

  // Color generator based on node type string
  const getTypeColor = (type: string) => {
    if (!type) return '#00f0ff';
    const cleanType = type.toLowerCase().trim();
    if (cleanType.includes('person') || cleanType.includes('character') || cleanType.includes('人物')) return '#ff007f'; // Hot pink
    if (cleanType.includes('location') || cleanType.includes('place') || cleanType.includes('地点') || cleanType.includes('org')) return '#9d4edd'; // Purple
    if (cleanType.includes('event') || cleanType.includes('meeting') || cleanType.includes('事件')) return '#ffb142'; // Amber
    if (cleanType.includes('concept') || cleanType.includes('idea') || cleanType.includes('概念')) return '#00e676'; // Emerald
    if (cleanType.includes('hyperedge') || cleanType.includes('relation-group')) return '#7c4dff'; // Indigo (hypergraph edge nodes)
    
    // Hash fallback
    let hash = 0;
    for (let i = 0; i < cleanType.length; i++) {
      hash = cleanType.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 85%, 65%)`;
  };

  // Convert raw nodes and edges into physics-ready items
  useEffect(() => {
    // 1. Filter nodes and edges if temporal currentTime is active
    let activeNodes = [...nodes];
    let activeEdges = [...edges];

    if (currentTime !== null && currentTime !== undefined && currentTime !== '') {
      // Find items matching time criteria
      // Simplistic check: item.time is at or before currentTime, or matches exactly
      const tVal = String(currentTime).toLowerCase();
      
      activeEdges = edges.filter(e => {
        if (!e.time) return true; // keep timeless elements
        return String(e.time).toLowerCase() <= tVal;
      });

      // Keep nodes that are either timeless or have time <= currentTime,
      // or are connected to at least one active edge
      const activeNodeKeys = new Set<string>();
      activeEdges.forEach(e => {
        activeNodeKeys.add(e.source);
        activeNodeKeys.add(e.target);
      });

      activeNodes = nodes.filter(n => {
        if (activeNodeKeys.has(n.id)) return true;
        if (!n.time) return true;
        return String(n.time).toLowerCase() <= tVal;
      });
    }

    // 2. Map structures for hypergraphs (bipartite model)
    let processedNodes: any[] = [];
    let processedLinks: any[] = [];

    if (isHypergraph) {
      // Create regular nodes
      processedNodes = activeNodes.map(n => ({
        id: n.id,
        name: n.name,
        type: n.type,
        description: n.description,
        isHyperedgeNode: false,
      }));

      // Create special nodes representing hyperedges
      activeEdges.forEach((e, idx) => {
        const edgeId = `hyperedge-${idx}`;
        const edgeName = (e as any).type || (e as any).label || 'Relation';
        
        // Add the hyperedge node itself
        processedNodes.push({
          id: edgeId,
          name: edgeName,
          type: 'Hyperedge',
          description: e.description || `Participants: ${(e as any).participants?.join(', ')}`,
          isHyperedgeNode: true,
          participants: (e as any).participants || [],
        });

        // Link all participant entities to the hyperedge node
        const participants = (e as any).participants || [];
        participants.forEach((pName: string) => {
          // Find the node corresponding to this participant
          const pNode = processedNodes.find(n => n.name === pName || n.id === pName);
          if (pNode) {
            processedLinks.push({
              source: pNode.id,
              target: edgeId,
              type: 'participates_in',
              isHyperlink: true,
              key: `${pNode.id}|participates_in|${edgeId}`,
            });
          }
        });
      });
    } else {
      // Standard Graph
      processedNodes = activeNodes.map(n => ({
        id: n.id,
        name: n.name,
        type: n.type,
        description: n.description,
        isHyperedgeNode: false,
        coordinates: n.coordinates,
      }));

      processedLinks = activeEdges.map(e => ({
        source: e.source,
        target: e.target,
        type: e.type,
        description: e.description,
        isHyperlink: false,
        key: `${e.source}|${e.type}|${e.target}`,
      }));
    }

    // Preserve positions of existing nodes during update
    const prevNodesMap = new Map(simNodesRef.current.map(n => [n.id, n]));
    
    simNodesRef.current = processedNodes.map(n => {
      const prev = prevNodesMap.get(n.id);
      
      // If spatial coordinates exist, lock them into place
      if (isSpatial && n.coordinates && Array.isArray(n.coordinates) && n.coordinates.length >= 2) {
        // Map coord values (e.g. lat/lng or x/y) to canvas center region
        const x = 400 + n.coordinates[0] * 5;
        const y = 300 - n.coordinates[1] * 5; // invert Y for standard cartesian
        return { ...n, x, y, fx: x, fy: y };
      }

      return {
        ...n,
        x: prev?.x ?? (200 + Math.random() * 400),
        y: prev?.y ?? (150 + Math.random() * 300),
        vx: prev?.vx ?? 0,
        vy: prev?.vy ?? 0,
      };
    });

    simLinksRef.current = processedLinks;

    // Reset center zoom transform if loading a new graph
    if (prevNodesMap.size === 0 && simNodesRef.current.length > 0) {
      setTransform({ x: 0, y: 0, scale: 1 });
    }
  }, [nodes, edges, isHypergraph, isSpatial, currentTime]);

  // Canvas Drawing & Physics Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    
    // Simple 2D force simulation step
    const stepSimulation = () => {
      const nodes = simNodesRef.current;
      const links = simLinksRef.current;
      if (nodes.length === 0) return;

      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;

      // 1. Repulsion (Charge) between every node pair
      for (let i = 0; i < nodes.length; i++) {
        const n1 = nodes[i];
        if (n1.fx !== undefined && n1.fx !== null) continue; // locked

        for (let j = i + 1; j < nodes.length; j++) {
          const n2 = nodes[j];
          const dx = n2.x - n1.x;
          const dy = n2.y - n1.y;
          let dist = Math.sqrt(dx * dx + dy * dy);
          if (dist === 0) dist = 0.1;

          // Coulomb repulsion formula
          const force = 400 / (dist * dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          n1.vx -= fx;
          n1.vy -= fy;
          n2.vx += fx;
          n2.vy += fy;
        }
      }

      // 2. Link Attraction (Spring force)
      const nodesMap = new Map(nodes.map(n => [n.id, n]));
      for (const link of links) {
        const src = nodesMap.get(link.source);
        const tgt = nodesMap.get(link.target);
        if (!src || !tgt) continue;

        const dx = tgt.x - src.x;
        const dy = tgt.y - src.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.1;
        
        // Spring target length
        const targetLen = link.isHyperlink ? 60 : 120;
        const k = 0.05; // spring constant
        const force = (dist - targetLen) * k;

        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        if (src.fx === undefined || src.fx === null) {
          src.vx += fx;
          src.vy += fy;
        }
        if (tgt.fx === undefined || tgt.fx === null) {
          tgt.vx -= fx;
          tgt.vy -= fy;
        }
      }

      // 3. Attraction to center & friction
      for (const n of nodes) {
        if (n.fx !== undefined && n.fx !== null) {
          n.x = n.fx;
          n.y = n.fy;
          n.vx = 0;
          n.vy = 0;
          continue;
        }

        // Center attraction
        const dx = centerX - n.x;
        const dy = centerY - n.y;
        n.vx += dx * 0.005;
        n.vy += dy * 0.005;

        // Apply friction/drag
        n.vx *= 0.85;
        n.vy *= 0.85;

        // Update position
        n.x += n.vx;
        n.y += n.vy;
      }
    };

    // Render loop
    const render = (time: number) => {
      // Handle resizing if container changed
      const container = containerRef.current;
      if (container && (canvas.width !== container.clientWidth || canvas.height !== container.clientHeight)) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
      }

      // Step physics
      if (!isSpatial) {
        stepSimulation();
      }

      const w = canvas.width;
      const h = canvas.height;

      // Clear with radial gradient background
      ctx.fillStyle = '#0f121a';
      ctx.fillRect(0, 0, w, h);

      // Radial glowing background center
      const radGrad = ctx.createRadialGradient(w / 2, h / 2, 50, w / 2, h / 2, Math.max(w, h) / 1.5);
      radGrad.addColorStop(0, 'rgba(18, 23, 33, 0.4)');
      radGrad.addColorStop(1, '#0a0c10');
      ctx.fillStyle = radGrad;
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      // Apply zoom & pan transformations
      ctx.translate(transform.x, transform.y);
      ctx.scale(transform.scale, transform.scale);

      const nodes = simNodesRef.current;
      const links = simLinksRef.current;
      const nodesMap = new Map(nodes.map(n => [n.id, n]));

      // 1. Draw Links/Edges
      for (const link of links) {
        const src = nodesMap.get(link.source);
        const tgt = nodesMap.get(link.target);
        if (!src || !tgt) continue;

        const isHighlighted = highlightedEdgeKeys.includes(link.key);
        const isHovered = hoveredEdge && hoveredEdge.key === link.key;

        // Edge style
        ctx.beginPath();
        ctx.moveTo(src.x, src.y);
        ctx.lineTo(tgt.x, tgt.y);

        if (link.isHyperlink) {
          ctx.strokeStyle = isHighlighted || isHovered ? '#7c4dff' : 'rgba(124, 77, 255, 0.15)';
          ctx.lineWidth = isHighlighted || isHovered ? 2 : 1;
          ctx.setLineDash([4, 4]); // Dotted lines for hyperedges
        } else {
          ctx.strokeStyle = isHighlighted
            ? '#00f0ff'
            : isHovered
            ? 'rgba(0, 240, 255, 0.6)'
            : 'rgba(255, 255, 255, 0.08)';
          ctx.lineWidth = isHighlighted || isHovered ? 2 : 1;
          ctx.setLineDash([]);
        }
        ctx.stroke();

        // Draw relationship type label on standard edge
        if (!link.isHyperlink && (isHighlighted || isHovered || nodes.length < 25)) {
          const midX = (src.x + tgt.x) / 2;
          const midY = (src.y + tgt.y) / 2;
          ctx.font = '500 9px "Inter", sans-serif';
          ctx.fillStyle = isHighlighted ? '#00f0ff' : 'rgba(255, 255, 255, 0.4)';
          ctx.textAlign = 'center';
          
          // Draw badge behind text
          const text = link.type || '';
          const textWidth = ctx.measureText(text).width;
          ctx.fillStyle = 'rgba(15, 18, 26, 0.85)';
          ctx.fillRect(midX - textWidth/2 - 4, midY - 6, textWidth + 8, 11);
          
          ctx.fillStyle = isHighlighted ? '#00f0ff' : 'rgba(255, 255, 255, 0.45)';
          ctx.fillText(text, midX, midY + 2);
        }
      }
      ctx.setLineDash([]); // Reset line dash

      // 2. Draw Nodes
      for (const n of nodes) {
        const color = getTypeColor(n.type);
        const isHighlighted = highlightedNodeIds.includes(n.id);
        const isHovered = hoveredNode && hoveredNode.id === n.id;
        
        const radius = n.isHyperedgeNode ? 8 : 12;

        // Draw pulsing halo glow for highlighted nodes
        if (isHighlighted) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, radius + 8 + Math.sin(time / 200) * 4, 0, 2 * Math.PI);
          ctx.strokeStyle = 'rgba(0, 240, 255, 0.35)';
          ctx.lineWidth = 2;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(n.x, n.y, radius + 4, 0, 2 * Math.PI);
          ctx.fillStyle = 'rgba(0, 240, 255, 0.1)';
          ctx.fill();
        }

        // Draw node body
        ctx.beginPath();
        if (n.isHyperedgeNode) {
          // Draw diamond shape for hyperedges
          ctx.moveTo(n.x, n.y - radius);
          ctx.lineTo(n.x + radius, n.y);
          ctx.lineTo(n.x, n.y + radius);
          ctx.lineTo(n.x - radius, n.y);
          ctx.closePath();
          
          ctx.fillStyle = '#0f121a';
          ctx.fill();
          ctx.strokeStyle = color;
          ctx.lineWidth = isHovered || isHighlighted ? 3 : 2;
          ctx.stroke();
        } else {
          // Regular node: circle
          ctx.arc(n.x, n.y, radius, 0, 2 * Math.PI);
          ctx.fillStyle = isHovered ? color : '#0f121a';
          ctx.fill();
          
          ctx.strokeStyle = color;
          ctx.lineWidth = isHovered || isHighlighted ? 3 : 2;
          ctx.stroke();

          // If hovered, draw a small inner circle
          if (!isHovered) {
            ctx.beginPath();
            ctx.arc(n.x, n.y, 4, 0, 2 * Math.PI);
            ctx.fillStyle = color;
            ctx.fill();
          }
        }

        // Draw Node label text
        ctx.font = isHovered || isHighlighted ? '600 11px "Outfit", sans-serif' : '500 10px "Outfit", sans-serif';
        ctx.fillStyle = isHighlighted 
          ? '#00f0ff' 
          : isHovered 
          ? '#ffffff' 
          : 'rgba(243, 244, 246, 0.85)';
        ctx.textAlign = 'center';
        
        // Label offset below node
        const labelText = n.name || n.id;
        ctx.fillText(labelText, n.x, n.y + radius + 15);

        // Sublabel (Type) if hovered
        if (isHovered && n.type) {
          ctx.font = 'normal 9px "Inter", sans-serif';
          ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
          ctx.fillText(n.type, n.x, n.y + radius + 26);
        }
      }

      ctx.restore();

      animationId = requestAnimationFrame(render);
    };

    animationId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [transform, hoveredNode, hoveredEdge, highlightedNodeIds, highlightedEdgeKeys, isSpatial]);

  // ==================== Zoom & Pan Mouse Events ====================

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const zoomFactor = 1.1;
    const nextScale = e.deltaY < 0 ? transform.scale * zoomFactor : transform.scale / zoomFactor;
    
    // Constraint zoom level
    const scale = Math.max(0.15, Math.min(nextScale, 4.0));

    // Zoom centered on cursor
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const dx = mouseX - transform.x;
    const dy = mouseY - transform.y;

    const x = mouseX - dx * (scale / transform.scale);
    const y = mouseY - dy * (scale / transform.scale);

    setTransform({ x, y, scale });
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Convert screen coord to world coord
    const worldX = (mouseX - transform.x) / transform.scale;
    const worldY = (mouseY - transform.y) / transform.scale;

    // Check if clicked a node
    let clickedNode = null;
    const nodes = simNodesRef.current;
    
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      const dist = Math.sqrt((n.x - worldX) ** 2 + (n.y - worldY) ** 2);
      const radius = n.isHyperedgeNode ? 8 : 12;
      if (dist <= radius + 5) {
        clickedNode = n;
        break;
      }
    }

    if (clickedNode) {
      // Lock node in place during drag
      dragNodeRef.current = clickedNode;
      clickedNode.fx = clickedNode.x;
      clickedNode.fy = clickedNode.y;
    } else {
      // Pan canvas
      isDraggingCanvasRef.current = true;
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      canvasStartRef.current = { x: transform.x, y: transform.y };
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const worldX = (mouseX - transform.x) / transform.scale;
    const worldY = (mouseY - transform.y) / transform.scale;

    if (dragNodeRef.current) {
      // Update dragged node position
      const n = dragNodeRef.current;
      n.x = worldX;
      n.y = worldY;
      n.fx = worldX;
      n.fy = worldY;
    } else if (isDraggingCanvasRef.current) {
      // Pan transform
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      setTransform({
        x: canvasStartRef.current.x + dx,
        y: canvasStartRef.current.y + dy,
        scale: transform.scale,
      });
    } else {
      // Hover detection
      let hitNode = null;
      const nodes = simNodesRef.current;
      for (let i = nodes.length - 1; i >= 0; i--) {
        const n = nodes[i];
        const dist = Math.sqrt((n.x - worldX) ** 2 + (n.y - worldY) ** 2);
        const radius = n.isHyperedgeNode ? 8 : 12;
        if (dist <= radius + 5) {
          hitNode = n;
          break;
        }
      }

      setHoveredNode(hitNode);

      if (!hitNode) {
        // Detect link hover
        let hitEdge = null;
        const links = simLinksRef.current;
        const nodesMap = new Map(nodes.map(n => [n.id, n]));

        for (const link of links) {
          const src = nodesMap.get(link.source);
          const tgt = nodesMap.get(link.target);
          if (!src || !tgt) continue;

          // Compute distance from point to line segment
          const l2 = (tgt.x - src.x) ** 2 + (tgt.y - src.y) ** 2;
          let dist = 999;
          if (l2 !== 0) {
            let t = ((worldX - src.x) * (tgt.x - src.x) + (worldY - src.y) * (tgt.y - src.y)) / l2;
            t = Math.max(0, Math.min(1, t));
            dist = Math.sqrt((worldX - (src.x + t * (tgt.x - src.x))) ** 2 + (worldY - (src.y + t * (tgt.y - src.y))) ** 2);
          }

          if (dist <= 6) {
            hitEdge = link;
            break;
          }
        }
        setHoveredEdge(hitEdge);
      } else {
        setHoveredEdge(null);
      }
    }
  };

  const handleMouseUp = () => {
    if (dragNodeRef.current) {
      // Unlock node unless spatial positioning locks it
      if (!isSpatial) {
        dragNodeRef.current.fx = null;
        dragNodeRef.current.fy = null;
      }
      
      // Fire click event if minimal movement
      if (onNodeClick && dragNodeRef.current) {
        onNodeClick(dragNodeRef.current);
      }
      dragNodeRef.current = null;
    }
    isDraggingCanvasRef.current = false;
  };

  return (
    <div 
      ref={containerRef} 
      style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}
    >
      <canvas
        ref={canvasRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ display: 'block', cursor: dragNodeRef.current ? 'grabbing' : hoveredNode ? 'pointer' : 'grab' }}
      />

      {/* Tooltip Overlay */}
      {hoveredNode && (
        <div 
          className="glass-panel" 
          style={{
            position: 'absolute',
            bottom: '16px',
            left: '16px',
            padding: '12px 16px',
            maxWidth: '320px',
            pointerEvents: 'none',
            zIndex: 10,
            borderLeft: `4px solid ${getTypeColor(hoveredNode.type)}`
          }}
        >
          <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>
            {hoveredNode.name}
          </div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {hoveredNode.type}
          </div>
          {hoveredNode.description && (
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
              {hoveredNode.description}
            </div>
          )}
        </div>
      )}

      {hoveredEdge && (
        <div 
          className="glass-panel" 
          style={{
            position: 'absolute',
            bottom: '16px',
            left: '16px',
            padding: '12px 16px',
            maxWidth: '320px',
            pointerEvents: 'none',
            zIndex: 10,
            borderLeft: `4px solid #00f0ff`
          }}
        >
          <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '4px', color: '#00f0ff' }}>
            Relation: {hoveredEdge.type}
          </div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginBottom: '8px' }}>
            {hoveredEdge.source} ➔ {hoveredEdge.target}
          </div>
          {hoveredEdge.description && (
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
              {hoveredEdge.description}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
