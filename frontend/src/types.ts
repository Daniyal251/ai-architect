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

export interface ROI {
  hours_saved: number;
  cost_saved: number;
  chart_data: { month: string; savings: number }[];
}

export interface AgentResponse {
  agent_profile: AgentProfile;
  description: string;
  mermaid_code: string;
  system_prompt: string;
  tech_stack: string[];
  implementation_plan: ImplementationStep[];
  roi: ROI;
  risk_status: 'normal' | 'warning' | 'high';
  session_id?: string;
}

export interface GenerationProgress {
  stage: string;
  step: number;
  total: number;
  completed?: boolean;
  error?: boolean;
}

// Авторизация
export interface User {
  username: string;
  disabled?: boolean;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
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
