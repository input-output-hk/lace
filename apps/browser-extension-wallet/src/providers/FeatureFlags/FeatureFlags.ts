import { config } from '@src/config';
import { PostHog } from 'posthog-js';
import { Subject, BehaviorSubject, Subscription } from 'rxjs';

const FEATURE_FLAGS_POLLING_INTERVAL = 10_000;

export class FeatureFlags {
  #enabledFlags: Subject<Array<string>> | BehaviorSubject<Array<string>>;
  constructor(private posthogInstance: PostHog, private useLocalFlags?: boolean) {
    if (!this.posthogInstance) console.warn('An instance of Post Hog has not been provided - local flags will be used');

    if (!this.posthogInstance || this.useLocalFlags) {
      this.loadLocalFlags();
    } else {
      this.#enabledFlags = new Subject();
      this.startPollingFlagsFromPostHog();
    }
  }

  startPollingFlagsFromPostHog(): void {
    this.pollFlagsFromPostHog();
    this.posthogInstance.onFeatureFlags((flags) => {
      this.#enabledFlags.next(flags);
    });
  }

  subscribeToRemoteFlags(callback: (params: Array<string>) => void): Subscription {
    return this.#enabledFlags.subscribe(callback);
  }

  private pollFlagsFromPostHog() {
    setInterval(() => {
      this.posthogInstance.reloadFeatureFlags();
    }, FEATURE_FLAGS_POLLING_INTERVAL);
  }

  private loadLocalFlags() {
    const { FEATURE_FLAGS } = config();
    const enabledFlags = [];

    for (const [key, isEnabled] of Object.entries(FEATURE_FLAGS)) {
      if (isEnabled === 'true') {
        enabledFlags.push(key);
      }
    }
    this.#enabledFlags = new BehaviorSubject(enabledFlags);
  }
}
