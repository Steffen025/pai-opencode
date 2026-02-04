export interface Stats {
  sessions_today: number;
  tools_today: number;
  avg_rating: number;
  security_blocks: number;
}

export interface Event {
  id: string;
  session_id: string;
  type: string;
  timestamp: string;
  data: Record<string, any>;
  metadata?: {
    duration_ms?: number;
    tool_name?: string;
    status?: string;
    [key: string]: any;
  };
}

export interface Session {
  session_id: string;
  started_at: string;
  ended_at?: string;
  event_count: number;
  tool_count: number;
  status: 'active' | 'ended';
}

export interface EventsResponse {
  events: Event[];
  total: number;
  offset: number;
  limit: number;
}

export interface SessionsResponse {
  sessions: Session[];
  total: number;
}
