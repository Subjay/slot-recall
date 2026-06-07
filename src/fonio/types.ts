// Internal loop-facing types. The rest of the system only ever sees these — never raw fonio shapes.

export type CallOutcome =
  | 'accepted'
  | 'declined'
  | 'no_answer'
  | 'voicemail'
  | 'callback'
  | 'recording_refused'
  | 'ambiguous';

export interface ParsedOutcome {
  callAttemptId: number;
  outcome: CallOutcome;
  outcomeReason: string | null;
  summary: string;
  fonioDebugId: string;
  completedAt: string;
}
