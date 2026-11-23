import type { ErrorEvent, Event, Integration } from '@sentry/react';

export interface ProxyFailureTags {
  service: string;
  network: string;
  operation: string;
  browserError: string;
}

export function preserveProxyDiagnosticDedupe(
  defaultIntegrations: Integration[],
): Integration[];

export function getDiagnosticRoutes(config?: Record<string, string>): unknown[];

export function getProxyFailureTags(
  details: { url: string; error: string },
  routes?: unknown[],
): ProxyFailureTags | null;

export function sanitizeProxyNetworkDiagnosticEvent(
  event: ErrorEvent,
): ErrorEvent | null;
export function sanitizeProxyNetworkDiagnosticEvent(event: Event): Event | null;

export function registerProxyNetworkDiagnostics(
  webRequest: unknown,
  observability: unknown,
  config?: Record<string, unknown>,
): void;
