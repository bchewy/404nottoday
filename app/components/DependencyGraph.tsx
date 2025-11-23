'use client';

import { useEffect, useRef, useState } from 'react';

interface Service {
  id: string;
  name: string;
  latestCheck: {
    status: 'UP' | 'DOWN' | 'ERROR';
  } | null;
}

interface DependencyGraphProps {
  services: Service[];
  dependencies: Map<string, string[]>;
}

interface Node {
  id: string;
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  status: 'UP' | 'DOWN' | 'ERROR' | null;
}

export function DependencyGraph({ services, dependencies }: DependencyGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const animationRef = useRef<number>();
  const nodesRef = useRef<Node[]>([]);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });

  useEffect(() => {
    const updateDimensions = () => {
      if (canvasRef.current?.parentElement) {
        const parent = canvasRef.current.parentElement;
        setDimensions({
          width: parent.clientWidth,
          height: Math.min(500, parent.clientWidth * 0.6)
        });
      }
    };
    
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = dimensions;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // Initialize nodes with physics
    const nodes: Node[] = services.map((service, i) => {
      const angle = (i / services.length) * Math.PI * 2;
      const radius = Math.min(width, height) * 0.3;
      return {
        id: service.id,
        name: service.name,
        x: width / 2 + Math.cos(angle) * radius,
        y: height / 2 + Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
        status: service.latestCheck?.status || null,
      };
    });

    nodesRef.current = nodes;

    // Force-directed graph simulation
    const simulate = () => {
      const centerX = width / 2;
      const centerY = height / 2;
      const damping = 0.85;
      const repulsionStrength = 2000;
      const attractionStrength = 0.001;
      const linkStrength = 0.02;

      nodes.forEach((node) => {
        // Repulsion from other nodes
        nodes.forEach((other) => {
          if (node.id === other.id) return;
          const dx = node.x - other.x;
          const dy = node.y - other.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = repulsionStrength / (dist * dist);
          node.vx += (dx / dist) * force;
          node.vy += (dy / dist) * force;
        });

        // Gentle pull toward center
        const dx = centerX - node.x;
        const dy = centerY - node.y;
        node.vx += dx * attractionStrength;
        node.vy += dy * attractionStrength;

        // Link forces
        const deps = dependencies.get(node.id) || [];
        deps.forEach((depId) => {
          const depNode = nodes.find((n) => n.id === depId);
          if (!depNode) return;
          const dx = depNode.x - node.x;
          const dy = depNode.y - node.y;
          node.vx += dx * linkStrength;
          node.vy += dy * linkStrength;
        });

        // Apply velocity
        node.x += node.vx;
        node.y += node.vy;
        node.vx *= damping;
        node.vy *= damping;

        // Keep in bounds
        const margin = 40;
        node.x = Math.max(margin, Math.min(width - margin, node.x));
        node.y = Math.max(margin, Math.min(height - margin, node.y));
      });
    };

    // Animation loop
    let time = 0;
    const animate = () => {
      time += 0.016;
      simulate();

      ctx.clearRect(0, 0, width, height);

      // Draw connections with flowing particles
      dependencies.forEach((deps, sourceId) => {
        const sourceNode = nodes.find((n) => n.id === sourceId);
        if (!sourceNode) return;

        deps.forEach((targetId) => {
          const targetNode = nodes.find((n) => n.id === targetId);
          if (!targetNode) return;

          // Gradient line
          const gradient = ctx.createLinearGradient(
            sourceNode.x,
            sourceNode.y,
            targetNode.x,
            targetNode.y
          );
          
          const isHovered = hoveredNode === sourceId || hoveredNode === targetId;
          const opacity = isHovered ? 0.6 : 0.2;
          
          gradient.addColorStop(0, `rgba(56, 189, 248, ${opacity})`);
          gradient.addColorStop(1, `rgba(139, 92, 246, ${opacity})`);

          ctx.strokeStyle = gradient;
          ctx.lineWidth = isHovered ? 2.5 : 1.5;
          ctx.setLineDash([5, 5]);
          ctx.lineDashOffset = -time * 20;
          
          ctx.beginPath();
          ctx.moveTo(sourceNode.x, sourceNode.y);
          ctx.lineTo(targetNode.x, targetNode.y);
          ctx.stroke();

          // Flowing particles
          if (isHovered) {
            const numParticles = 3;
            for (let i = 0; i < numParticles; i++) {
              const t = ((time * 0.5 + i / numParticles) % 1);
              const px = sourceNode.x + (targetNode.x - sourceNode.x) * t;
              const py = sourceNode.y + (targetNode.y - sourceNode.y) * t;
              
              ctx.fillStyle = `rgba(56, 189, 248, ${1 - t})`;
              ctx.beginPath();
              ctx.arc(px, py, 3, 0, Math.PI * 2);
              ctx.fill();
            }
          }

          // Arrow
          const angle = Math.atan2(targetNode.y - sourceNode.y, targetNode.x - sourceNode.x);
          const arrowSize = 8;
          const offset = 25;
          const arrowX = targetNode.x - Math.cos(angle) * offset;
          const arrowY = targetNode.y - Math.sin(angle) * offset;

          ctx.fillStyle = gradient;
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.moveTo(arrowX, arrowY);
          ctx.lineTo(
            arrowX - arrowSize * Math.cos(angle - Math.PI / 6),
            arrowY - arrowSize * Math.sin(angle - Math.PI / 6)
          );
          ctx.lineTo(
            arrowX - arrowSize * Math.cos(angle + Math.PI / 6),
            arrowY - arrowSize * Math.sin(angle + Math.PI / 6)
          );
          ctx.closePath();
          ctx.fill();
        });
      });

      // Draw nodes
      nodes.forEach((node) => {
        const isHovered = hoveredNode === node.id;
        const nodeRadius = isHovered ? 24 : 20;

        // Glow effect
        if (isHovered) {
          const glowGradient = ctx.createRadialGradient(
            node.x,
            node.y,
            0,
            node.x,
            node.y,
            nodeRadius * 2
          );
          glowGradient.addColorStop(0, 'rgba(56, 189, 248, 0.3)');
          glowGradient.addColorStop(1, 'rgba(56, 189, 248, 0)');
          ctx.fillStyle = glowGradient;
          ctx.beginPath();
          ctx.arc(node.x, node.y, nodeRadius * 2, 0, Math.PI * 2);
          ctx.fill();
        }

        // Node circle
        const statusColors = {
          UP: '#10b981',
          DOWN: '#ef4444',
          ERROR: '#f59e0b',
          null: '#71717a'
        };

        ctx.fillStyle = statusColors[node.status || 'null'];
        ctx.strokeStyle = isHovered ? '#38bdf8' : '#3f3f46';
        ctx.lineWidth = isHovered ? 3 : 2;
        ctx.setLineDash([]);
        
        ctx.beginPath();
        ctx.arc(node.x, node.y, nodeRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Pulse animation for DOWN services
        if (node.status === 'DOWN') {
          const pulse = Math.sin(time * 3) * 0.5 + 0.5;
          ctx.strokeStyle = `rgba(239, 68, 68, ${pulse})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(node.x, node.y, nodeRadius + 4 + pulse * 3, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Label
        ctx.fillStyle = '#ffffff';
        ctx.font = `${isHovered ? '13px' : '11px'} system-ui, -apple-system, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const maxWidth = 80;
        const words = node.name.split(' ');
        let line = '';
        let y = node.y + nodeRadius + 15;
        
        words.forEach((word, i) => {
          const testLine = line + (i > 0 ? ' ' : '') + word;
          const metrics = ctx.measureText(testLine);
          if (metrics.width > maxWidth && line !== '') {
            ctx.fillText(line, node.x, y);
            line = word;
            y += 14;
          } else {
            line = testLine;
          }
        });
        ctx.fillText(line, node.x, y);
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [services, dependencies, hoveredNode, dimensions]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const hoveredNode = nodesRef.current.find((node) => {
      const dx = node.x - x;
      const dy = node.y - y;
      return Math.sqrt(dx * dx + dy * dy) < 24;
    });

    setHoveredNode(hoveredNode?.id || null);
  };

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredNode(null)}
        className="cursor-pointer"
        style={{ touchAction: 'none' }}
      />
      
      {hoveredNode && (
        <div className="absolute top-4 left-4 bg-zinc-900/95 backdrop-blur-sm border border-zinc-700 rounded-lg px-4 py-3 text-sm">
          <div className="font-medium text-white mb-1">
            {nodesRef.current.find(n => n.id === hoveredNode)?.name}
          </div>
          <div className="text-zinc-400 text-xs">
            Dependencies: {dependencies.get(hoveredNode)?.length || 0}
          </div>
        </div>
      )}
    </div>
  );
}
