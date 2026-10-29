import type { JobStatus, ProofStage } from './protocol';

export type ProofJobObserver = (
  id: string,
  status: JobStatus,
  stage?: ProofStage,
) => void;
export type ProofActivity = {
  id: string;
  number: number;
  steps?: {
    id: 'checking' | 'proving' | 'receiving';
    status: 'done' | 'failed' | 'pending' | 'running';
  }[];
  kind: 'check' | 'proof' | 'transaction';
  status:
    | 'failed'
    | 'preparing'
    | 'queued'
    | 'receiving'
    | 'running'
    | 'succeeded';
};

/** Session-local operation summaries; never retain witnesses, keys or raw errors. */
export const createProofActivityStore = ({
  successRetentionMs = 5000,
  historyLimit = 50,
}: { successRetentionMs?: number; historyLimit?: number } = {}) => {
  // Completion order, not creation order: active jobs never consume history slots.
  const completed = new Map<string, number | undefined>();
  let expiryTimer: ReturnType<typeof setTimeout> | undefined;
  const activities = new Map<string, ProofActivity>();
  const listeners = new Set<(activities: ProofActivity[]) => void>();
  let sequence = 0;
  const snapshot = () =>
    [...activities.values()].map(activity => ({
      ...activity,
      ...(activity.steps
        ? { steps: activity.steps.map(step => ({ ...step })) }
        : {}),
    }));
  const prune = () => {
    clearTimeout(expiryTimer);
    const now = Date.now();
    for (const [id, expires] of completed) {
      if (
        (expires !== undefined && expires <= now) ||
        completed.size > historyLimit
      ) {
        completed.delete(id);
        activities.delete(id);
      }
    }
    const expiries = [...completed.values()].filter(
      (value): value is number => value !== undefined,
    );
    if (expiries.length)
      expiryTimer = setTimeout(
        publish,
        Math.max(0, Math.min(...expiries) - now),
      );
  };
  const publish = () => {
    prune();
    for (const listener of listeners) listener(snapshot());
  };
  const retain = (activity: ProofActivity) => {
    completed.set(
      activity.id,
      activity.status === 'succeeded'
        ? Date.now() + successRetentionMs
        : undefined,
    );
    publish();
  };
  const begin = (
    kind: ProofActivity['kind'],
    status: ProofActivity['status'],
    withCheck = false,
  ) => {
    const id = crypto.randomUUID();
    const activity: ProofActivity = {
      id,
      number: ++sequence,
      kind,
      status,
      ...(withCheck
        ? {
            steps: [
              { id: 'receiving' as const, status: 'running' as const },
              { id: 'checking' as const, status: 'pending' as const },
              { id: 'proving' as const, status: 'pending' as const },
            ],
          }
        : {}),
    };
    activities.set(id, activity);
    publish();
    const jobs = new Map<string, JobStatus>();
    let isFinished = false;
    let hasStarted = false;
    const failStep = () => {
      const step =
        activity.steps?.find(item => item.status === 'running') ??
        activity.steps?.find(item => item.status === 'pending');
      if (step) step.status = 'failed';
    };
    const fail = () => {
      if (isFinished || hasStarted) return;
      isFinished = true;
      activity.status = 'failed';
      failStep();
      retain(activity);
    };
    return {
      fail,
      run: async <T>(
        task: (observe: ProofJobObserver) => Promise<T>,
      ): Promise<T> => {
        if (isFinished || hasStarted)
          throw new Error('Proof preparation has ended');
        hasStarted = true;
        if (activity.steps) activity.steps[0].status = 'done';
        activity.status = 'preparing';
        publish();
        try {
          const result = await task((job, status, stage) => {
            if (isFinished) return;
            jobs.set(job, status);
            if (stage && activity.steps) {
              const index = activity.steps.findIndex(
                step => step.id === stage.phase,
              );
              activity.steps.forEach((step, stepIndex) => {
                if (stepIndex < index) step.status = 'done';
                else if (stepIndex === index)
                  step.status =
                    stage.status === 'completed' ? 'done' : 'running';
              });
            }
            const states = [...jobs.values()];
            const next = states.includes('running')
              ? 'running'
              : states.includes('queued')
              ? 'queued'
              : activity.status;
            if (activity.status !== next || stage) {
              activity.status = next;
              publish();
            }
          });
          activity.status = 'succeeded';
          activity.steps?.forEach(step => {
            step.status = 'done';
          });
          return result;
        } catch (error) {
          activity.status = 'failed';
          failStep();
          throw error;
        } finally {
          isFinished = true;
          retain(activity);
        }
      },
    };
  };
  return {
    subscribe: (listener: (activities: ProofActivity[]) => void) => {
      prune();
      listeners.add(listener);
      listener(snapshot());
      return () => {
        listeners.delete(listener);
      };
    },
    dismiss: (id: string) => {
      const status = activities.get(id)?.status;
      if (status !== 'succeeded' && status !== 'failed') return;
      activities.delete(id);
      completed.delete(id);
      publish();
    },
    prepare: (kind: ProofActivity['kind'], withCheck = false) =>
      begin(kind, 'receiving', withCheck),
    run: async <T>(
      kind: ProofActivity['kind'],
      task: (observe: ProofJobObserver) => Promise<T>,
      withCheck = false,
    ) => begin(kind, 'preparing', withCheck).run(task),
  };
};
