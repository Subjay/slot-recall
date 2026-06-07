import { config } from '../config';
import type { FonioOutboundRequest, FonioOutboundResponse } from './fonio-shapes';

export interface PlaceCallParams {
  callAttemptId: number;
  toNumber: string;      // E.164
  patientFirstName: string;
  patientLastName: string;
  slotStart: Date;
  location: string;
}

export interface PlaceCallResult {
  accepted: boolean;
  message: string;
  simulated: boolean;
}

export async function placeOutboundCall(params: PlaceCallParams): Promise<PlaceCallResult> {
  if (!config.FONIO_LIVE) {
    console.log('[fonio/client] simulated — FONIO_LIVE=false', {
      to: params.toNumber,
      callAttemptId: params.callAttemptId,
    });
    return { accepted: true, message: 'simulated', simulated: true };
  }

  const body: FonioOutboundRequest = {
    apiKey: config.FONIO_API_KEY,
    fromNumber: config.FONIO_FROM_NUMBER,
    toNumber: params.toNumber,
    agentId: config.FONIO_AGENT_ID,
    context: {
      call_attempt_id: params.callAttemptId,
      first_name: params.patientFirstName,
      last_name: params.patientLastName,
      day: params.slotStart.getDate(),         // day-of-month, NOT getDay()
      month: params.slotStart.getMonth() + 1,  // 1-indexed
      year: params.slotStart.getFullYear(),
      location: params.location,
    },
  };

  const res = await fetch('https://app.fonio.ai/api/public/v1/outbound_call', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.FONIO_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`fonio HTTP ${res.status}: ${await res.text()}`);
  }

  const data = (await res.json()) as FonioOutboundResponse;
  return {
    accepted: data.status === 'success',
    message: data.message,
    simulated: false,
  };
}
