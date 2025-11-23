'use client';

import { StatusBadge } from './StatusBadge';
import { useState, useEffect } from 'react';

interface ServiceCardProps {
  service: {
    id: string;
    name: string;
    url: string;
    environment?: string | null;
    expectedVersion?: string | null;
    latestCheck: {
      status: 'UP' | 'DOWN' | 'ERROR';
      latency: number | null;
      detectedVersion: string | null;
      errorMessage: string | null;
      timestamp: string;
    } | null;
    stats: {
      uptime24h: number;
      avgLatency24h: number | null;
      totalChecks24h: number;
    };
    history: {
      status: string;
      latency: number | null;
      timestamp: string;
    }[];
  };
  onEdit?: (service: ServiceCardProps['service']) => void;
  onDelete?: (serviceId: string) => void;
}

export function ServiceCard({ service, onEdit, onDelete }: ServiceCardProps) {
  const latestCheck = service.latestCheck;
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const versionMismatch =
    service.expectedVersion &&
    latestCheck?.detectedVersion &&
    service.expectedVersion !== latestCheck.detectedVersion;

  // Determine status color
  const getStatusColor = () => {
    if (!latestCheck?.status) return 'zinc';
    if (latestCheck.status === 'UP') return 'emerald';
    if (latestCheck.status === 'DOWN') return 'rose';
    return 'amber';
  };

  const statusColor = getStatusColor();

  // Fetch AI explanation when error changes
  useEffect(() => {
    if (latestCheck?.errorMessage) {
      setLoadingAi(true);
      fetch('/api/explain-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          errorMessage: latestCheck.errorMessage,
          url: service.url,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          setAiExplanation(data.explanation);
        })
        .catch(() => {
          setAiExplanation(null);
        })
        .finally(() => {
          setLoadingAi(false);
        });
    } else {
      setAiExplanation(null);
    }
  }, [latestCheck?.errorMessage, service.url]);

  return (
    <div className="relative group h-full flex flex-col">
      {/* Corner brackets */}
      <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-white/40 transition-all group-hover:w-6 group-hover:h-6 group-hover:border-white/60"></div>
      <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-white/40 transition-all group-hover:w-6 group-hover:h-6 group-hover:border-white/60"></div>
      <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-white/40 transition-all group-hover:w-6 group-hover:h-6 group-hover:border-white/60"></div>
      <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-white/40 transition-all group-hover:w-6 group-hover:h-6 group-hover:border-white/60"></div>

      {/* Status indicator bar - top */}
      <div className={`absolute top-0 left-8 right-8 h-0.5 bg-gradient-to-r from-transparent via-${statusColor}-500 to-transparent opacity-60`}></div>

      {/* Main card */}
      <div className="relative bg-black/60 backdrop-blur-md border border-white/10 p-5 transition-all group-hover:bg-black/70 group-hover:border-white/20 flex-1 flex flex-col">
        {/* Header with glitch-style service name */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <div className="mb-2">
              <div className="flex items-start gap-3 mb-1">
                {/* Status pulse dot */}
                <div className="relative flex items-center justify-center flex-shrink-0 mt-1.5">
                  <div className={`absolute w-3 h-3 bg-${statusColor}-500 rounded-full opacity-20 animate-ping`}></div>
                  <div className={`w-2 h-2 bg-${statusColor}-500 rounded-full shadow-lg shadow-${statusColor}-500/50`}></div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 flex-wrap">
                    <h3 
                      className="text-xl font-bold text-white tracking-tight line-clamp-2" 
                      style={{ fontFamily: 'monospace' }}
                      title={service.name}
                    >
                      {service.name}
                    </h3>
                    
                    {service.environment && (
                      <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 border border-white/30 text-white/70 font-mono flex-shrink-0 mt-0.5">
                        {service.environment}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-start gap-2 text-xs text-zinc-500 font-mono ml-7">
                <span className="flex-shrink-0">{'>'}</span>
                <p className="break-all">
                  {service.url}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-4">
            <StatusBadge status={latestCheck?.status || null} />
            {(onEdit || onDelete) && (
              <div className="flex items-center gap-1">
                {onEdit && (
                  <button
                    onClick={() => onEdit(service)}
                    className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 border border-transparent hover:border-white/20 transition-all"
                    title="Edit service"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => onDelete(service.id)}
                    className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all"
                    title="Delete service"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Stats grid with diagonal separator */}
        <div className="relative grid grid-cols-2 gap-4 mb-4">
          <div className="relative">
            <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1 font-mono">Latency</div>
            <div className="text-2xl font-bold text-white font-mono tabular-nums">
              {latestCheck?.latency !== null && latestCheck?.latency !== undefined
                ? `${latestCheck.latency}ms`
                : '—'}
            </div>
          </div>
          
          {/* Diagonal separator */}
          <div className="absolute top-0 bottom-0 left-1/2 w-px bg-gradient-to-b from-transparent via-white/20 to-transparent -skew-x-12"></div>
          
          <div className="relative">
            <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1 font-mono">Uptime 24h</div>
            <div className="text-2xl font-bold text-white font-mono tabular-nums">
              {service.stats.uptime24h.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Health History Sparkline */}
        {service.history && service.history.length > 0 && (
          <div className="mb-4">
            <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2 font-mono">Health History</div>
            <div className="flex items-end gap-[2px] h-12 bg-black/40 border border-white/5 p-2">
              {service.history.slice(0, 50).reverse().map((check, idx) => {
                const maxLatency = 1000; // 1 second as max for scaling
                const latency = check.latency || 0;
                const heightPercent = Math.min((latency / maxLatency) * 100, 100);
                
                const barColor = 
                  check.status === 'UP' ? 'bg-emerald-500' :
                  check.status === 'DOWN' ? 'bg-rose-500' :
                  'bg-amber-500';
                
                const timestamp = new Date(check.timestamp).toLocaleString('en-US', {
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: false
                });
                
                return (
                  <div
                    key={idx}
                    className={`flex-1 min-w-[2px] ${barColor} transition-all hover:opacity-80 relative group/bar`}
                    style={{ height: `${Math.max(heightPercent, 5)}%` }}
                  >
                    {/* Tooltip on hover */}
                    <div className="hidden group-hover/bar:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black border border-white/20 text-[10px] font-mono whitespace-nowrap z-10 pointer-events-none shadow-xl">
                      <div className="text-white font-bold">{check.status}</div>
                      <div className="text-zinc-300">{latency}ms</div>
                      <div className="text-zinc-500">{timestamp}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between mt-1 text-[9px] text-zinc-600 font-mono">
              <span>Oldest</span>
              <span>Latest</span>
            </div>
          </div>
        )}

        {/* Version info with retro terminal style */}
        {(service.expectedVersion || latestCheck?.detectedVersion) && (
          <div className="mb-3 border border-white/10 bg-white/5">
            <div className="flex items-center justify-between px-3 py-2 text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="text-zinc-600">[</span>
                <span className="text-zinc-500">Expected:</span>
                <span className="text-white">{service.expectedVersion || 'N/A'}</span>
                <span className="text-zinc-600">]</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-zinc-600">[</span>
                <span className="text-zinc-500">Detected:</span>
                <span className={versionMismatch ? 'text-amber-400' : 'text-white'}>
                  {latestCheck?.detectedVersion || 'N/A'}
                </span>
                <span className="text-zinc-600">]</span>
              </div>
            </div>
            {versionMismatch && (
              <div className="px-3 py-1.5 bg-amber-500/10 border-t border-amber-500/20">
                <p className="text-[10px] text-amber-400 font-mono uppercase tracking-wider">⚠ Version mismatch</p>
              </div>
            )}
          </div>
        )}

        {/* Error message */}
        {latestCheck?.errorMessage && (
          <div className="mb-3 border border-rose-500/30 bg-rose-500/5 px-3 py-2 space-y-2">
            <div className="flex items-start gap-2">
              <span className="text-rose-500 text-xs font-mono flex-shrink-0">[!]</span>
              <p className="text-xs text-rose-300 font-mono flex-1 line-clamp-2" title={latestCheck.errorMessage}>{latestCheck.errorMessage}</p>
            </div>
            {loadingAi && (
              <div className="flex items-center gap-2 pt-2 border-t border-rose-500/20">
                <div className="h-2 w-2 rounded-full bg-rose-400 animate-pulse"></div>
                <span className="text-[10px] text-rose-400 font-mono">AI thinking...</span>
              </div>
            )}
            {aiExplanation && (
              <div className="pt-2 border-t border-rose-500/20">
                <div className="flex items-start gap-2">
                  <span className="text-rose-400 text-[10px] font-mono flex-shrink-0 uppercase tracking-wider">AI:</span>
                  <p className="text-xs text-rose-200 italic">{aiExplanation}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Spacer to push timestamp to bottom */}
        <div className="flex-1"></div>

        {/* Timestamp footer */}
        {latestCheck?.timestamp && (
          <div className="pt-3 border-t border-white/10 mt-auto">
            <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-wider">
              Last: {new Date(latestCheck.timestamp).toLocaleString('en-US', { 
                month: '2-digit', 
                day: '2-digit', 
                year: '2-digit',
                hour: '2-digit', 
                minute: '2-digit',
                second: '2-digit',
                hour12: false 
              })}
            </p>
          </div>
        )}
      </div>

      {/* Subtle glow effect on hover */}
      <div className={`absolute inset-0 bg-${statusColor}-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none blur-xl`}></div>
    </div>
  );
}

