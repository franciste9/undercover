import type { Outcome, Stage } from "./api";

export const STAGES: Record<Stage, string> = {
  waiting: "Waiting",
  in_progress: "In progress",
  awaiting_signoff: "Waiting for sign-off",
  decided: "Decided",
};

export const STAGE_ORDER: Stage[] = [
  "waiting",
  "in_progress",
  "awaiting_signoff",
  "decided",
];

export const OUTCOMES: Record<Outcome, string> = {
  approve: "Approved",
  decline: "Declined",
  refer: "Referred",
};

export function money(amount: number): string {
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function words(value: string): string {
  const spaced = value.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function when(timestamp: string): string {
  return new Date(timestamp).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function clock(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString("en-US", {
    timeStyle: "medium",
  });
}

export function hours(count: number): string {
  return `${count.toString()} hours`;
}

export function said(reason: unknown): string {
  return reason instanceof Error ? reason.message : String(reason);
}
