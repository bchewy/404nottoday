'use client';

import { useState, useEffect } from 'react';
import { Trash2, Plus, Check, X, Bell, X as CloseIcon, Send, MessageSquare, Globe, Search } from 'lucide-react';

interface Webhook {
  id: string;
  name: string;
  url: string | null;
  type: string;
  config: any;
  events: string[];
  enabled: boolean;
  createdAt: string;
}

interface WebhookModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const EVENT_TYPES = [
  { id: 'SERVICE_DOWN', label: 'Service Down' },
  { id: 'SERVICE_UP', label: 'Service Up' },
  { id: 'VERSION_CHANGE', label: 'Version Change' },
  { id: 'STATUS_CHANGE', label: 'Any Status Change' },
];

const CHANNEL_TYPES = [
  { id: 'WEBHOOK', label: 'Generic Webhook', icon: Globe },
  { id: 'TELEGRAM', label: 'Telegram Bot', icon: MessageSquare },
];

export function WebhookModal({ isOpen, onClose }: WebhookModalProps) {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [type, setType] = useState('WEBHOOK');
  const [url, setUrl] = useState('');
  const [events, setEvents] = useState<string[]>(['STATUS_CHANGE']);
  const [submitting, setSubmitting] = useState(false);
  
  // Telegram state
  const [tgToken, setTgToken] = useState('');
  const [tgChatId, setTgChatId] = useState('');
  const [detectingChatId, setDetectingChatId] = useState(false);

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
    if (events.length === 0) {
      alert('Please select at least one event.');
      return;
    }
    setSubmitting(true);
    try {
      const payload: any = { name, type, events };
      
      if (type === 'WEBHOOK') {
        payload.url = url;
      } else if (type === 'TELEGRAM') {
        payload.config = { token: tgToken, chatId: tgChatId };
      }

      const res = await fetch('/api/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      if (res.ok) {
        setName('');
        setUrl('');
        setTgToken('');
        setTgChatId('');
        setType('WEBHOOK');
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

  const handleTest = async (id: string) => {
    setTestingId(id);
    try {
      const res = await fetch(`/api/webhooks/${id}/test`, { method: 'POST' });
      const data = await res.json();
      
      if (res.ok) {
        alert('Test notification sent successfully!');
      } else {
        alert(`Failed to send test notification: ${data.error}`);
      }
    } catch (error) {
      console.error('Failed to test webhook', error);
      alert('Failed to send test notification. Check console for details.');
    } finally {
      setTestingId(null);
    }
  };

  const toggleEvent = (eventId: string) => {
    setEvents(prev => 
      prev.includes(eventId) 
        ? prev.filter(id => id !== eventId) 
        : [...prev, eventId]
    );
  };

  const detectChatId = async () => {
    if (!tgToken) {
      alert('Please enter your Bot Token first.');
      return;
    }
    setDetectingChatId(true);
    try {
      const res = await fetch(`https://api.telegram.org/bot${tgToken}/getUpdates`);
      const data = await res.json();
      
      if (data.ok && data.result.length > 0) {
        // Find the last message from a user (ignoring other update types if possible)
        const lastMessage = data.result.slice().reverse().find((u: any) => u.message?.chat?.id);
        if (lastMessage) {
          setTgChatId(String(lastMessage.message.chat.id));
          alert('Chat ID detected!');
        } else {
          alert('No recent messages found. Please send a message to your bot first.');
        }
      } else {
        alert('No updates found. Please send a message to your bot first.');
      }
    } catch (error) {
      console.error('Failed to detect chat ID', error);
      alert('Failed to detect Chat ID. Is the token correct?');
    } finally {
      setDetectingChatId(false);
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
              <div className="mb-4">
                <label className="block text-xs font-medium text-zinc-400 mb-2">Channel Type</label>
                <div className="flex gap-2">
                  {CHANNEL_TYPES.map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setType(t.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm border transition-colors ${
                        type === t.id 
                          ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500' 
                          : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:bg-zinc-800'
                      }`}
                    >
                      <t.icon className="w-4 h-4" />
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 mb-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder={type === 'TELEGRAM' ? "e.g. DevOps Channel" : "e.g. Slack Notification"}
                    className="w-full rounded-md bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                {type === 'WEBHOOK' ? (
                  <div className="sm:col-span-2">
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
                ) : (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1">Bot Token</label>
                      <input
                        type="text"
                        required
                        value={tgToken}
                        onChange={e => setTgToken(e.target.value)}
                        placeholder="123456:ABC-DEF1234..."
                        className="w-full rounded-md bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1">Chat ID</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          required
                          value={tgChatId}
                          onChange={e => setTgChatId(e.target.value)}
                          placeholder="-100123456789"
                          className="flex-1 rounded-md bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={detectChatId}
                          disabled={detectingChatId}
                          className="px-3 py-2 bg-zinc-800 text-zinc-300 rounded-md hover:bg-zinc-700 transition-colors disabled:opacity-50"
                          title="Auto-detect Chat ID from last message"
                        >
                          {detectingChatId ? <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-r-transparent" /> : <Search className="w-4 h-4" />}
                        </button>
                      </div>
                      <p className="text-[10px] text-zinc-500 mt-1">Message your bot first, then click search to auto-fill.</p>
                    </div>
                  </>
                )}
              </div>

              <div className="mt-4">
                <label className="block text-xs font-medium text-zinc-400 mb-2">Trigger Events</label>
                <div className="grid grid-cols-2 gap-2">
                  {EVENT_TYPES.map(t => (
                    <label key={t.id} className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer p-2 rounded hover:bg-zinc-900/50">
                      <input
                        type="checkbox"
                        checked={events.includes(t.id)}
                        onChange={() => toggleEvent(t.id)}
                        className="rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-emerald-500/20"
                      />
                      {t.label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
                >
                  {submitting ? 'Saving...' : 'Add Channel'}
                </button>
              </div>
            </form>
          )}

          <div className="space-y-3">
            {loading && webhooks.length === 0 ? (
              <div className="text-center py-4 text-zinc-500 text-sm">Loading channels...</div>
            ) : webhooks.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-zinc-800 rounded-lg">
                <p className="text-zinc-500 text-sm">No notification channels configured.</p>
              </div>
            ) : (
              webhooks.map(webhook => (
                <div
                  key={webhook.id}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    webhook.enabled ? 'bg-zinc-950/50 border-zinc-800' : 'bg-zinc-950/20 border-zinc-800/50 opacity-75'
                  }`}
                >
                  <div className="min-w-0 flex-1 mr-4">
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className={`p-1.5 rounded-md ${webhook.type === 'TELEGRAM' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'}`}>
                        {webhook.type === 'TELEGRAM' ? <MessageSquare className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                      </div>
                      <h3 className="font-medium text-zinc-200">{webhook.name}</h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        webhook.enabled ? 'bg-emerald-500/10 text-emerald-500' : 'bg-zinc-500/10 text-zinc-500'
                      }`}>
                        {webhook.enabled ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-1 font-mono truncate">
                      {webhook.type === 'TELEGRAM' ? 'Telegram Bot' : webhook.url}
                    </p>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {webhook.events.map(event => (
                        <span key={event} className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                          {EVENT_TYPES.find(t => t.id === event)?.label || event}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleTest(webhook.id)}
                      disabled={testingId === webhook.id}
                      className="p-2 text-blue-400 hover:bg-blue-400/10 rounded-md transition-colors disabled:opacity-50"
                      title="Send Test Notification"
                    >
                      {testingId === webhook.id ? (
                        <div className="w-4 h-4 animate-spin rounded-full border-2 border-blue-400 border-r-transparent"></div>
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </button>
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
