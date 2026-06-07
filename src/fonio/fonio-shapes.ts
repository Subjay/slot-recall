// Raw fonio API shapes — reference only. Nothing outside src/fonio/ should import these.

export interface FonioOutboundRequest {
  apiKey: string;
  fromNumber: string;
  toNumber: string;
  agentId: string;
  context: FonioCallContext;
}

export interface FonioCallContext {
  call_attempt_id: number;
  first_name: string;
  last_name: string;
  day: number;     // day-of-month via date.getDate(), NOT getDay()
  month: number;   // 1-indexed via date.getMonth() + 1
  year: number;
  location: string;
  [key: string]: unknown;
}

export interface FonioOutboundResponse {
  status: 'success' | 'error';
  message: string;
}

export interface FonioWebhookPayload {
  id: string;
  summary: string;
  transcript: FonioTranscriptEntry[];
  formattedTranscript: string;
  formattedPlainTranscript: string;
  fromNumber: string;
  toNumber: string;
  direction: 'outbound' | 'inbound';
  duration: number;
  disconnectReason: string;
  startTimestamp: string;
  endTimestamp: string;
  audioLink: string | null;
  context: FonioWebhookContext;
  extractionData: FonioExtractionData;
}

// context is echoed back from our outbound request; values come back as strings even if sent as numbers
export interface FonioWebhookContext {
  call_attempt_id: string;
  day: string;
  month: string;
  year: string;
  location: string;
  first_name: string;
  last_name: string;
  fonio?: unknown;
  [key: string]: unknown;
}

export interface FonioExtractionData {
  name: string | null;
  answer: string | null;
  reason: string | null;
}

export interface FonioTranscriptEntry {
  id: string;
  content: string;
  role: 'agent' | 'user';
  timestampSecond: number;
  index: number;
}
