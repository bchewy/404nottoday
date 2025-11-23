'use client';

import { useState, useEffect } from 'react';
import { Trash2, Plus, Check, X, Bell, X as CloseIcon } from 'lucide-react';

interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  enabled: boolean;
  createdAt: string;
}

interface WebhookModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WebhookModal({ isOpen, onClose }: WebhookModalProps) {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [events, setEvents] = useState<string[]>(['STATUS_CHANGE']);
  const [submitting, setSubmitting] = useState(false);

  const fetchWebhooks = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/webhooks');
      if (res.ok) {
        setWebhooks(await res.json());
      }
    } catch (error) {
      console.error('Failed to fetch webhooks', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchWebhooks();
    }
  }, [isOpen]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, url, events }),
      });
      
      if (res.ok) {
        setName('');
        setUrl('');
        setEvents(['STATUS_CHANGE']);
        setIsAdding(false);
        fetchWebhooks();
      }
    } catch (error) {
      console.error('Failed to create webhook', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this webhook?')) return;
    try {
      await fetch(`/api/webhooks/${id}`, { method: 'DELETE' });
      setWebhooks(prev => prev.filter(w => w.id !== id));
    } catch (error) {
      console.error('Failed to delete webhook', error);
    }
  };

  const toggleEnabled = async (webhook: Webhook) => {
    try {
      const res = await fetch(`/api/webhooks/${webhook.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !webhook.enabled }),
      });
      
      if (res.ok) {
        setWebhooks(prev => prev.map(w => 
          w.id === webhook.id ? { ...w, enabled: !w.enabled } : w
        ));
      }
    } catch (error) {
      console.error('Failed to toggle webhook', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-xl border border-zinc-800 bg-zinc-900 shadow-xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <h2 className="text-xl font-semibold text-zinc-100 flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Manage Webhooks
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setIsAdding(!isAdding)}
              className="inline-flex items-center gap-2 rounded-lg bg-zinc-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              {isAdding ? 'Cancel' : 'Add Webhook'}
            </button>
          </div>

          {isAdding && (
            <form onSubmit={handleCreate} className="mb-6 bg-zinc-950/50 p-4 rounded-lg border border-zinc-800">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Slack Notification"
                    className="w-full rounded-md bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Webhook URL</label>
                  <input
                    type="url"
                    required
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    placeholder="https://api.slack.com/..."
                    className="w-full rounded-md bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
                >
                  {submitting ? 'Saving...' : 'Create Webhook'}
                </button>
              </div>
            </form>
          )}

          <div className="space-y-3">
            {loading && webhooks.length === 0 ? (
              <div className="text-center py-4 text-zinc-500 text-sm">Loading webhooks...</div>
            ) : webhooks.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-zinc-800 rounded-lg">
                <p className="text-zinc-500 text-sm">No webhooks configured.</p>
              </div>
            ) : (
              webhooks.map(webhook => (
                <div
                  key={webhook.id}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    webhook.enabled ? 'bg-zinc-950/50 border-zinc-800' : 'bg-zinc-950/20 border-zinc-800/50 opacity-75'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="font-medium text-zinc-200">{webhook.name}</h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        webhook.enabled ? 'bg-emerald-500/10 text-emerald-500' : 'bg-zinc-500/10 text-zinc-500'
                      }`}>
                        {webhook.enabled ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-1 font-mono truncate max-w-md">{webhook.url}</p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleEnabled(webhook)}
                      className={`p-2 rounded-md transition-colors ${
                        webhook.enabled 
                          ? 'text-emerald-400 hover:bg-emerald-400/10' 
                          : 'text-zinc-400 hover:bg-zinc-400/10'
                      }`}
                      title={webhook.enabled ? 'Disable' : 'Enable'}
                    >
                      {webhook.enabled ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleDelete(webhook.id)}
                      className="p-2 text-zinc-400 hover:text-rose-400 hover:bg-rose-400/10 rounded-md transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

