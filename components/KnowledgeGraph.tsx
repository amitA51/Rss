import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { FeedItem, Tag } from '../types';

interface Node {
  id: string;
  type: 'item' | 'tag';
  label: string;
  radius: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  data: FeedItem | Tag;
  color: string;
}

interface Link {
  source: string;
  target: string;
}

interface KnowledgeGraphProps {
  items: FeedItem[];
  onSelectItem: (item: FeedItem) => void;
}

// --- Simulation Constants ---
const DAMPING = 0.95;
const REPULSION_STRENGTH = -350;
const LINK_STRENGTH = 0.05;
const CENTER_STRENGTH = 0.01;
const CLUSTER_STRENGTH = 0.05;

// --- Physics Calculation Helpers for Readability ---
const applyRepulsion = (nodes: Node[]) => {
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const nodeA = nodes[i];
      const nodeB = nodes[j];
      const dx = nodeB.x - nodeA.x;
      const dy = nodeB.y - nodeA.y;
      const distance = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = REPULSION_STRENGTH / (distance * distance);
      const fx = (dx / distance) * force;
      const fy = (dy / distance) * force;
      nodeA.vx += fx;
      nodeA.vy += fy;
      nodeB.vx -= fx;
      nodeB.vy -= fy;
    }
  }
};

const applyLinkForces = (nodes: Node[], links: Link[], nodeMap: Map<string, Node>, isClustered: boolean) => {
  links.forEach(link => {
    const source = nodeMap.get(link.source);
    const target = nodeMap.get(link.target);
    if (!source || !target) return;

    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const distance = Math.sqrt(dx * dx + dy * dy) || 1;
    const force = (distance - (isClustered ? 80 : 100)) * LINK_STRENGTH;
    const fx = (dx / distance) * force;
    const fy = (dy / distance) * force;

    source.vx += fx;
    source.vy += fy;
    target.vx -= fx;
    target.vy -= fy;
  });
};

const applyGravity = (nodes: Node[], { width, height }: { width: number, height: number }, clusterCenter: { x: number, y: number } | null, connectedNodeIds: Set<string>) => {
    nodes.forEach(node => {
        if (clusterCenter) { // Clustered mode
            if (connectedNodeIds.has(node.id)) {
                // Stronger pull towards cluster center
                const dx = clusterCenter.x - node.x;
                const dy = clusterCenter.y - node.y;
                node.vx += dx * CLUSTER_STRENGTH;
                node.vy += dy * CLUSTER_STRENGTH;
            } else {
                // Push unconnected nodes away
                const dx = node.x - width / 2;
                const dy = node.y - height / 2;
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                node.vx += (dx / dist) * 0.1;
                node.vy += (dy / dist) * 0.1;
            }
        } else { // Normal mode
            const dx = width / 2 - node.x;
            const dy = height / 2 - node.y;
            node.vx += dx * CENTER_STRENGTH;
            node.vy += dy * CENTER_STRENGTH;
        }
    });
};


const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({ items, onSelectItem }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<number | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const initialData = useMemo(() => {
    const uniqueTags = new Map<string, Tag>();
    for (const item of items) {
      for (const tag of item.tags) {
        if (!uniqueTags.has(tag.id)) {
          uniqueTags.set(tag.id, tag);
        }
      }
    }

    const itemNodes: Node[] = items.map(item => ({
      id: item.id,
      type: 'item',
      label: item.title,
      radius: item.type === 'spark' ? 12 : 8,
      x: 0, y: 0, vx: 0, vy: 0,
      data: item,
      color: 'rgba(59, 130, 246, 0.8)',
    }));

    const tagNodes: Node[] = Array.from(uniqueTags.values()).map(tag => ({
      id: tag.id,
      type: 'tag',
      label: tag.name,
      radius: 6,
      x: 0, y: 0, vx: 0, vy: 0,
      data: tag,
      color: 'rgba(139, 92, 246, 0.8)',
    }));

    const newLinks: Link[] = [];
    for (const item of items) {
      for (const tag of item.tags) {
        if (uniqueTags.has(tag.id)) {
          newLinks.push({ source: item.id, target: tag.id });
        }
      }
    }

    return { nodes: [...itemNodes, ...tagNodes], links: newLinks };
  }, [items]);
  
  useEffect(() => {
    if (!containerRef.current) return;
    const { width, height } = containerRef.current.getBoundingClientRect();
    setDimensions({ width, height });

    setNodes(initialData.nodes.map(node => ({
        ...node,
        x: width / 2 + (Math.random() - 0.5) * 100,
        y: height / 2 + (Math.random() - 0.5) * 100,
    })));
    setLinks(initialData.links);

  }, [initialData]);
  
  const connectedNodeIds = useMemo(() => {
    if (!selectedTagId) return new Set<string>();
    const connected = new Set([selectedTagId]);
    links.forEach(link => {
      if (link.source === selectedTagId) connected.add(link.target);
      if (link.target === selectedTagId) connected.add(link.source);
    });
    return connected;
  }, [selectedTagId, links]);

  const tick = useCallback(() => {
    setNodes(prevNodes => {
      const { width, height } = dimensions;
      if (width === 0) return prevNodes;
  
      const mutableNodes = prevNodes.map(n => ({ ...n, vx: n.id === draggedNodeId ? 0 : n.vx, vy: n.id === draggedNodeId ? 0 : n.vy }));
      const nodeMap: Map<string, Node> = new Map(mutableNodes.map(n => [n.id, n]));
      
      let clusterCenter: { x: number, y: number } | null = null;
      if (selectedTagId) {
          const clusterNodes = mutableNodes.filter(n => connectedNodeIds.has(n.id));
          if(clusterNodes.length > 0) {
              clusterCenter = clusterNodes.reduce((acc, n) => ({ x: acc.x + n.x, y: acc.y + n.y }), { x: 0, y: 0 });
              clusterCenter.x /= clusterNodes.length;
              clusterCenter.y /= clusterNodes.length;
          }
      }

      // Apply forces
      applyRepulsion(mutableNodes);
      applyLinkForces(mutableNodes, links, nodeMap, !!selectedTagId);
      applyGravity(mutableNodes, dimensions, clusterCenter, connectedNodeIds);
  
      // Apply damping, update positions, and check boundaries
      return mutableNodes.map(node => {
        if (node.id !== draggedNodeId) {
          node.vx *= DAMPING;
          node.vy *= DAMPING;
          node.x += node.vx;
          node.y += node.vy;
        }
  
        // Boundary collision
        if (node.x - node.radius < 0) { node.x = node.radius; node.vx = -node.vx * 0.5; }
        if (node.x + node.radius > width) { node.x = width - node.radius; node.vx = -node.vx * 0.5; }
        if (node.y - node.radius < 0) { node.y = node.radius; node.vy = -node.vy * 0.5; }
        if (node.y + node.radius > height) { node.y = height - node.radius; node.vy = -node.vy * 0.5; }
        
        return node;
      });
    });
  
    simulationRef.current = requestAnimationFrame(tick);
  }, [links, dimensions, draggedNodeId, selectedTagId, connectedNodeIds]);

  useEffect(() => {
    simulationRef.current = requestAnimationFrame(tick);
    return () => {
      if (simulationRef.current) {
        cancelAnimationFrame(simulationRef.current);
      }
    };
  }, [tick]);

  const handleNodeClick = (node: Node) => {
    if (node.type === 'item') {
      onSelectItem(node.data as FeedItem);
    } else {
      setSelectedTagId(prev => (prev === node.id ? null : node.id));
    }
  };
  
  const getPointerPosition = (event: React.MouseEvent | React.TouchEvent) => {
      const svg = containerRef.current!.querySelector('svg');
      if (!svg) return { x: 0, y: 0 };
      const CTM = svg.getScreenCTM();
      if (!CTM) return { x: 0, y: 0 };
      const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
      const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;
      return {
          x: (clientX - CTM.e) / CTM.a,
          y: (clientY - CTM.f) / CTM.d
      };
  };

  const handleMouseDown = (e: React.MouseEvent, nodeId: string) => {
    setDraggedNodeId(nodeId);
    const pos = getPointerPosition(e);
    setNodes(nodes.map(n => n.id === nodeId ? {...n, x: pos.x, y: pos.y } : n));
  };
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggedNodeId) return;
    const pos = getPointerPosition(e);
    setNodes(nodes.map(n => n.id === draggedNodeId ? {...n, x: pos.x, y: pos.y } : n));
  };
  
  const handleMouseUp = () => {
    setDraggedNodeId(null);
  };

  return (
    <div 
        ref={containerRef} 
        className="w-full h-[70vh] cursor-grab active:cursor-grabbing"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
    >
        <style>{`
          .graph-node { transition: opacity 0.3s, transform 0.3s; }
          .graph-node:hover { transform: scale(1.2); }
          .graph-link { transition: opacity 0.3s; }
          .graph-label {
            font-size: 10px; fill: #e5e7eb;
            text-anchor: middle; pointer-events: none;
            opacity: 0; transition: opacity 0.3s;
          }
          .graph-node:hover .graph-label, .graph-node.focused .graph-label { opacity: 1; }
        `}</style>
      {dimensions.width > 0 && (
        <svg width="100%" height="100%" viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}>
          <g>
            {links.map(link => {
               const source = nodes.find(n => n.id === link.source);
               const target = nodes.find(n => n.id === link.target);
               if (!source || !target) return null;
               const isActive = selectedTagId && (connectedNodeIds.has(source.id) && connectedNodeIds.has(target.id));
               return (
                  <line
                    key={`${link.source}-${link.target}`}
                    x1={source.x} y1={source.y}
                    x2={target.x} y2={target.y}
                    stroke="rgba(255,255,255,0.2)"
                    className="graph-link"
                    style={{ opacity: selectedTagId ? (isActive ? 0.4 : 0.05) : 0.2 }}
                  />
               )
            })}
          </g>
          <g>
            {nodes.map(node => {
                const isConnected = connectedNodeIds.has(node.id);
                const isHovered = hoveredNodeId === node.id;
                const isFocused = isConnected || isHovered;
                return (
                    <g 
                        key={node.id} 
                        transform={`translate(${node.x},${node.y})`}
                        className={`graph-node ${isFocused ? 'focused' : ''}`}
                        style={{ 
                            opacity: selectedTagId ? (isConnected ? 1 : 0.3) : 1,
                            cursor: 'pointer'
                        }}
                        onClick={() => handleNodeClick(node)}
                        onMouseDown={(e) => handleMouseDown(e, node.id)}
                        onMouseEnter={() => setHoveredNodeId(node.id)}
                        onMouseLeave={() => setHoveredNodeId(null)}
                    >
                        <circle 
                            r={node.radius + (isFocused ? 3 : 0)} 
                            fill={node.color} 
                            stroke={isFocused ? 'rgba(255,255,255,0.8)' : 'none'}
                            strokeWidth="2"
                        />
                        <text y={node.radius + 12} className="graph-label" dominantBaseline="middle">
                            {node.label.length > 20 ? node.label.substring(0, 20) + '...' : node.label}
                        </text>
                    </g>
                )
            })}
          </g>
        </svg>
      )}
    </div>
  );
};

export default KnowledgeGraph;
