export type OffscreenApi = {
  hasDocument(): Promise<boolean>;
  createDocument(options: {
    url: string;
    reasons: string[];
    justification: string;
  }): Promise<void>;
  closeDocument(): Promise<void>;
};

export type OffscreenManagerResult =
  | { ok: false; error: string }
  | { ok: true };

/** A role represents a service, not an individual request. Its owner must keep
 * the role until all its jobs finish. The page's liveness report also protects
 * work inherited from a previous service-worker lifetime. */
export const createOffscreenManager = <Role extends string>({
  offscreen,
  probeActive,
  url,
  reasons,
  justification,
}: {
  offscreen: OffscreenApi;
  probeActive: () => Promise<boolean | null>;
  url: string;
  reasons: string[];
  justification: string;
}) => {
  const roles = new Set<Role>();
  let queue: Promise<unknown> = Promise.resolve();
  const enqueue = async (
    operation: () => Promise<void>,
  ): Promise<OffscreenManagerResult> => {
    const run = queue.then(async (): Promise<OffscreenManagerResult> => {
      try {
        await operation();
        return { ok: true };
      } catch (error) {
        return {
          ok: false,
          error: String(error instanceof Error ? error.message : error),
        };
      }
    });
    queue = run;
    return run;
  };
  return {
    acquireRole: async (role: Role) =>
      enqueue(async () => {
        // Never replace an existing document: a slow startup/probe is not evidence
        // that its workers are dead. The caller's service handshake checks readiness.
        if (!(await offscreen.hasDocument())) {
          await offscreen.createDocument({ url, reasons, justification });
        }
        roles.add(role);
      }),
    releaseRole: async (role: Role) =>
      enqueue(async () => {
        roles.delete(role);
        if (roles.size || !(await offscreen.hasDocument())) return;
        // Unknown liveness preserves the document. Only an explicit idle response
        // authorizes closure, including after a service-worker restart.
        if ((await probeActive().catch(() => null)) === false)
          await offscreen.closeDocument();
      }),
    activeRoles: (): Role[] => [...roles],
  };
};
