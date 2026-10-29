import type { RetryBackoffConfig } from 'backoff-rxjs';
import type { Observable } from 'rxjs';

export type ObservableType<O> = O extends Observable<infer T> ? T : unknown;

export type ReconnectionConfig = Omit<RetryBackoffConfig, 'shouldRetry'>;
