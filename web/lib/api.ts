import type { Agent, CreateAgentInput, KnowledgeDocument, SearchResult } from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ── Agents API ──────────────────────────────────────────────

export const agentsApi = {
  list: () => request<Agent[]>('/agents'),
  get: (id: string) => request<Agent>(`/agents/${id}`),
  create: (data: CreateAgentInput) =>
    request<Agent>('/agents', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<CreateAgentInput>) =>
    request<Agent>(`/agents/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<void>(`/agents/${id}`, { method: 'DELETE' }),
};

// ── Knowledge API ───────────────────────────────────────────

export const knowledgeApi = {
  list: (agentId: string) =>
    fetch(`${API_BASE.replace('3001', '8000')}/knowledge/${agentId}/documents`)
      .then((r) => r.json())
      .then((r) => r.documents as KnowledgeDocument[]),

  upload: async (agentId: string, file: File): Promise<void> => {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(
      `${API_BASE.replace('3001', '8000')}/knowledge/${agentId}/upload`,
      { method: 'POST', body: form },
    );
    if (!res.ok) throw new Error('Upload failed');
  },

  delete: (agentId: string, docId: string) =>
    fetch(
      `${API_BASE.replace('3001', '8000')}/knowledge/${agentId}/documents/${docId}`,
      { method: 'DELETE' },
    ),

  search: (agentId: string, query: string) =>
    fetch(`${API_BASE.replace('3001', '8000')}/knowledge/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agent_id: agentId, query }),
    })
      .then((r) => r.json())
      .then((r) => r.results as SearchResult[]),
};

// ── HITL API ────────────────────────────────────────────────

export const hitlApi = {
  respond: (sessionId: string, approved: boolean, reason?: string) =>
    request('/chat/hitl/respond', {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId, approved, reason }),
    }),
};
