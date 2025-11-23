'use client';

import { useEffect, useState } from 'react';
import { ServiceCard } from './components/ServiceCard';
import { ServiceModal } from './components/ServiceModal';
import { HowItWorks } from './components/HowItWorks';
import { WebhookModal } from './components/WebhookModal';
import { DependencyGraph } from './components/DependencyGraph';
import { Bell, Network } from 'lucide-react';

interface Service {
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
}

interface StatusResponse {
  services: Service[];
  timestamp: string;
}

export default function Home() {
  const [data, setData] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isWebhookModalOpen, setIsWebhookModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [showDependencyGraph, setShowDependencyGraph] = useState(false);
  const [dependencies, setDependencies] = useState<Map<string, string[]>>(new Map());

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/status');
      if (!response.ok) throw new Error('Failed to fetch status');
      const json = await response.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const response = await fetch('/api/refresh', { method: 'POST' });
      if (!response.ok) throw new Error('Failed to refresh');
      // Wait a bit for the poll to complete, then fetch new status
      setTimeout(() => {
        fetchStatus();
        setRefreshing(false);
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setRefreshing(false);
    }
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    setIsModalOpen(true);
  };

  const handleDelete = async (serviceId: string) => {
    if (!confirm('Are you sure you want to delete this service? All monitoring data will be lost.')) {
      return;
    }

    try {
      const response = await fetch(`/api/services/${serviceId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete service');
      }

      // Refresh the service list
      fetchStatus();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete service');
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingService(null);
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // Refresh UI every 30s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const buildDependencyMap = async () => {
      try {
        const response = await fetch('/api/dependencies');
        if (response.ok) {
          const deps = await response.json();
          const map = new Map<string, string[]>();
          Object.entries(deps || {}).forEach(([key, value]) => {
            map.set(key, value as string[]);
          });
          setDependencies(map);
        }
      } catch (err) {
        console.error('Failed to fetch dependencies:', err);
      }
    };

    buildDependencyMap();
  }, [data]);

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-zinc-100 border-r-transparent"></div>
          <p className="mt-4 text-sm text-zinc-400">Loading service status...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="text-center">
          <p className="text-rose-400 font-medium">Error: {error}</p>
          <button
            onClick={() => {
              setLoading(true);
              fetchStatus();
            }}
            className="mt-4 px-4 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const services = data?.services || [];
  const allUp = services.every((s) => s.latestCheck?.status === 'UP');
  const anyDown = services.some((s) => s.latestCheck?.status === 'DOWN');
  const anyError = services.some((s) => s.latestCheck?.status === 'ERROR');

  let systemStatus = 'All Systems Operational';
  let systemStatusColor = 'text-emerald-400';

  if (anyDown) {
    systemStatus = 'Some Services Down';
    systemStatusColor = 'text-rose-400';
  } else if (anyError) {
    systemStatus = 'Service Errors Detected';
    systemStatusColor = 'text-amber-400';
  }

  return (
    <div className="min-h-screen bg-transparent">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-zinc-100">404 not Today</h1>
              <p className="mt-2 text-sm text-zinc-400">
                Real-time monitoring of critical service endpoints
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowDependencyGraph(!showDependencyGraph)}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors ${
                  showDependencyGraph ? 'bg-violet-600 hover:bg-violet-500' : 'bg-zinc-800 hover:bg-zinc-700'
                }`}
                title="Toggle Dependency Graph"
              >
                <Network className="w-4 h-4" />
                <span className="hidden sm:inline">Graph</span>
              </button>
              <button
                onClick={() => setIsWebhookModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-zinc-700 transition-colors"
                title="Manage Webhooks"
              >
                <Bell className="w-4 h-4" />
                <span className="hidden sm:inline">Webhooks</span>
              </button>
              <button
                onClick={() => {
                  setEditingService(null);
                  setIsModalOpen(true);
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-500 transition-colors"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Add Service
              </button>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="inline-flex items-center gap-2 rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
              {refreshing ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent"></div>
                  Refreshing...
                </>
              ) : (
                <>
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Refresh Now
                </>
              )}
              </button>
            </div>
          </div>

          {/* System Status */}
          <div className="mt-6 rounded-lg bg-zinc-900/80 backdrop-blur-sm px-6 py-4 shadow-sm border border-zinc-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`h-3 w-3 rounded-full ${
                    allUp ? 'bg-emerald-500' : anyDown ? 'bg-rose-500' : 'bg-amber-500'
                  }`}
                ></div>
                <span className={`text-lg font-semibold ${systemStatusColor}`}>
                  {systemStatus}
                </span>
              </div>
              <div className="text-sm text-zinc-400">
                {services.length} service{services.length !== 1 ? 's' : ''} monitored
              </div>
            </div>
          </div>
        </div>

        {/* Dependency Graph */}
        {showDependencyGraph && services.length > 0 && (
          <div className="mb-8 rounded-lg bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 p-6 overflow-hidden">
            <h2 className="text-xl font-semibold text-zinc-100 mb-4 flex items-center gap-2">
              <Network className="w-5 h-5 text-violet-400" />
              Service Dependencies
            </h2>
            <DependencyGraph services={services} dependencies={dependencies} />
          </div>
        )}

        {/* Services Grid */}
        {services.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-zinc-700 bg-zinc-900/80 backdrop-blur-sm p-12 text-center">
            <p className="text-zinc-400">No services configured. Click "Add Service" to get started.</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 auto-rows-fr">
            {services.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        {/* How It Works Section */}
        <HowItWorks />

        {/* Footer */}
        <div className="mt-12 text-center text-xs text-zinc-500">
          Last updated: {data?.timestamp ? new Date(data.timestamp).toLocaleString() : 'N/A'}
        </div>
      </div>

      {/* Service Modal (Add/Edit) */}
      <ServiceModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSuccess={() => fetchStatus()}
        initialData={editingService}
      />

      {/* Webhook Modal */}
      <WebhookModal
        isOpen={isWebhookModalOpen}
        onClose={() => setIsWebhookModalOpen(false)}
      />
    </div>
  );
}
