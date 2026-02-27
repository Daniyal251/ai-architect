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
}
