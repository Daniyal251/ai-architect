export interface AgentProfile {
  name: string;
  role: string;
  avatar: string;
}

export interface ImplementationStep {
  day: number;
  task: string;
  duration: string;
}

export interface KeyMetric {
  label: string;   // "Ориентировочная стоимость"
  value: string;   // "300,000 - 800,000"
  unit: string;    // "₽"
}

export interface ResourceGroup {
  category: string;   // "Запчасти", "Инструменты"
  items: string[];
}

export interface ProjectMetrics {
  project_type: 'technical' | 'business' | 'research' | 'other';
  key_metrics: KeyMetric[];
  resources_needed: ResourceGroup[];
}

export interface AgentResponse {
  agent_profile: AgentProfile;
  description: string;
  mermaid_code: string;
  system_prompt: string;
  tech_stack: string[];
  implementation_plan: ImplementationStep[];
  project_metrics: ProjectMetrics;
  risk_status: 'normal' | 'warning' | 'high';
  session_id?: string;
}

export interface GenerationProgress {
  stage: string;
  step: number;
  total: number;
  completed?: boolean;
  error?: boolean;
  result?: AgentResponse; // финальный результат приходит в последнем SSE-событии
}

// Авторизация
export interface User {
  username: string;
  plan?: string;
  disabled?: boolean;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  email?: string;
}

// Тарифы и лимиты
export interface UsageInfo {
  plan: 'free' | 'starter' | 'pro' | 'admin';
  plan_name: string;
  generations_used: number;
  generations_limit: number;   // -1 = безлимит
  generations_remaining: number;
  agents_count: number;
  agents_limit: number;        // -1 = безлимит
  can_generate: boolean;
  can_save_agent: boolean;
}

export interface AuthToken {
  access_token: string;
  token_type: string;
  username: string;
}

// Диалог для уточнения
export interface DialogMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ClarifyRequest {
  idea: string;
  conversation_history?: DialogMessage[];
}

export interface ClarifyResponse {
  needs_clarification: boolean;
  questions: string[];
  summary: string;
}

// Сохранённые агенты
export interface SavedAgentListItem {
  id: string;
  name: string;
  role: string;
  avatar: string;
  idea: string;
  created_at: string;
}
