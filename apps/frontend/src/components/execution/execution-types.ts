export type ExecutionKind =
  | "thinking"
  | "policy"
  | "tool"
  | "scrape"
  | "success"
  | "error"
  | "approval";

export type ExecutionStatus = "active" | "done" | "error";

export interface ExecutionRecord {
  id: string;
  kind: ExecutionKind;
  title: string;
  subtitle?: string;
  status: ExecutionStatus;
  /** Optional: tool name for chip styling */
  toolName?: string;
  serverLabel?: string;
}
