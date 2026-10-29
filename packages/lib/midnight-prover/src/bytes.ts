// Chrome messaging is JSON-only. Keep encoded chunks well below its 64 MiB limit.
export const CHUNK_BYTES = 256 * 1024;
export type ByteRef = { id: string; size: number; digest: string };
export type ByteOperation =
  | { operation: 'chunk'; ref: string; offset: number; hex: string }
  | { operation: 'commit'; ref: string }
  | { operation: 'read'; ref: string; offset: number }
  | { operation: 'upload'; size: number; digest: string };
export type ByteReply = { ref: ByteRef; ready: boolean; hex?: string };
export const hex = (bytes: Uint8Array): string => {
  const parts: string[] = [];
  for (const byte of bytes) parts.push(byte.toString(16).padStart(2, '0'));
  return parts.join('');
};
const unhex = (value: string): Uint8Array => {
  if (
    typeof value !== 'string' ||
    value.length > CHUNK_BYTES * 2 ||
    value.length % 2 ||
    !/^[\da-f]*$/i.test(value)
  )
    throw new Error('Invalid proof chunk');
  return Uint8Array.from({ length: value.length / 2 }, (_, index) =>
    Number.parseInt(value.slice(index * 2, index * 2 + 2), 16),
  );
};
export const digest = async (bytes: Uint8Array): Promise<string> =>
  hex(
    new Uint8Array(
      await crypto.subtle.digest('SHA-256', bytes as Uint8Array<ArrayBuffer>),
    ),
  );

type Entry = {
  owner: string;
  ref: ByteRef;
  bytes: Uint8Array;
  offset: number;
  ready: boolean;
  validating?: boolean;
  leases: Map<string, number>;
  touched: number;
};
/** Session-only storage. Reservations count before allocation; active jobs pin inputs. */
export const createByteStore = ({
  now = Date.now,
  maxBytes = 256 * 1024 * 1024,
  maxEntries = 64,
  maxUploads = 4,
  maxSessions = 8,
  retentionMs = 60_000,
}: {
  now?: () => number;
  maxBytes?: number;
  maxEntries?: number;
  maxUploads?: number;
  maxSessions?: number;
  retentionMs?: number;
} = {}) => {
  const entries = new Map<string, Entry>();
  const lease = (owner: string, job: string) => JSON.stringify([owner, job]);
  const sweep = () => {
    for (const [id, entry] of entries) {
      for (const [key, until] of entry.leases)
        if (until <= now()) entry.leases.delete(key);
      if (
        !entry.leases.size &&
        (!entry.ready || entry.touched + retentionMs <= now())
      )
        entries.delete(id);
    }
  };
  const reserve = (size: number) => {
    sweep();
    if (!Number.isSafeInteger(size) || size < 0 || size > maxBytes)
      throw new Error('Proof material exceeds the session memory limit');
    const used = () =>
      [...entries.values()].reduce((sum, entry) => sum + entry.ref.size, 0);
    for (const [id, entry] of [...entries].sort(
      (a, b) => a[1].touched - b[1].touched,
    )) {
      if (used() + size <= maxBytes && entries.size < maxEntries) break;
      if (!entry.leases.size) entries.delete(id);
    }
    if (used() + size > maxBytes || entries.size >= maxEntries)
      throw new Error(
        'Proof material memory budget is busy; retry after current work finishes',
      );
  };
  const get = (owner: string, job: string, id: string) => {
    const entry = entries.get(id);
    if (!entry || entry.owner !== owner || !entry.leases.has(lease(owner, job)))
      throw new Error('Proof material is no longer available');
    entry.touched = now();
    if (entry.leases.get(lease(owner, job)) !== Infinity)
      entry.leases.set(lease(owner, job), now() + retentionMs);
    return entry;
  };
  return {
    sweep,
    isActive: () => {
      sweep();
      return entries.size > 0;
    },
    release: (owner: string, job: string) => {
      for (const [id, entry] of entries) {
        entry.leases.delete(lease(owner, job));
        if (!entry.ready && !entry.leases.size) entries.delete(id);
      }
      sweep();
    },
    pin: (owner: string, job: string, references: ByteRef[]) => {
      const selected = references.map(ref => {
        const entry = get(owner, job, ref.id);
        if (
          !entry.ready ||
          entry.ref.size !== ref.size ||
          entry.ref.digest !== ref.digest
        )
          throw new Error('Invalid proof material handle');
        return entry;
      });
      for (const entry of selected)
        entry.leases.set(lease(owner, job), Infinity);
      return selected.map(entry => entry.bytes);
    },
    storeResult: async (
      owner: string,
      job: string,
      bytes: Uint8Array,
    ): Promise<ByteRef> => {
      reserve(bytes.length);
      const ref = { id: crypto.randomUUID(), size: bytes.length, digest: '' };
      const entry: Entry = {
        owner,
        ref,
        bytes,
        offset: bytes.length,
        ready: false,
        leases: new Map([[lease(owner, job), Infinity]]),
        touched: now(),
      };
      entries.set(ref.id, entry);
      try {
        ref.digest = await digest(bytes);
        entry.ready = true;
        return ref;
      } catch (error) {
        entries.delete(ref.id);
        throw error;
      }
    },
    handle: async (
      command: ByteOperation,
      owner: string,
      job: string,
    ): Promise<ByteReply> => {
      sweep();
      const session = lease(owner, job);
      const sessions = new Set(
        [...entries.values()].flatMap(entry => [...entry.leases.keys()]),
      );
      if (!sessions.has(session) && sessions.size >= maxSessions)
        throw new Error('Too many proof material sessions');
      // Progress on any chunk keeps all inputs for this request leased, even
      // when uploading one large key takes longer than the inactivity timeout.
      for (const entry of entries.values())
        if (entry.leases.has(session) && entry.leases.get(session) !== Infinity)
          entry.leases.set(session, now() + retentionMs);
      if (command.operation === 'upload') {
        if (
          typeof command.digest !== 'string' ||
          !/^[\da-f]{64}$/.test(command.digest)
        )
          throw new Error('Invalid proof material digest');
        const existing = [...entries.values()].find(
          entry =>
            entry.owner === owner &&
            entry.ready &&
            entry.ref.size === command.size &&
            entry.ref.digest === command.digest,
        );
        if (existing) {
          if (existing.leases.get(lease(owner, job)) !== Infinity)
            existing.leases.set(lease(owner, job), now() + retentionMs);
          existing.touched = now();
          return { ref: existing.ref, ready: true };
        }
        if (
          [...entries.values()].filter(entry => !entry.ready).length >=
          maxUploads
        )
          throw new Error('Too many proof material uploads');
        reserve(command.size);
        const ref = {
          id: crypto.randomUUID(),
          size: command.size,
          digest: command.digest,
        };
        entries.set(ref.id, {
          owner,
          ref,
          bytes: new Uint8Array(command.size),
          offset: 0,
          ready: false,
          leases: new Map([[lease(owner, job), now() + retentionMs]]),
          touched: now(),
        });
        return { ref, ready: false };
      }
      const entry = get(owner, job, command.ref);
      if (command.operation === 'chunk') {
        const bytes = unhex(command.hex);
        if (
          entry.ready ||
          entry.validating ||
          command.offset !== entry.offset ||
          bytes.length === 0 ||
          entry.offset + bytes.length > entry.ref.size
        )
          throw new Error('Out-of-order or oversized proof chunk');
        entry.bytes.set(bytes, entry.offset);
        entry.offset += bytes.length;
      } else if (command.operation === 'commit') {
        if (entry.offset !== entry.ref.size)
          throw new Error('Incomplete proof material upload');
        if (!entry.ready) {
          // Freeze writes before awaiting hashing. A concurrent chunk cannot alter validated data.
          if (entry.validating)
            throw new Error('Proof material validation is already in progress');
          entry.validating = true;
          try {
            if ((await digest(entry.bytes)) !== entry.ref.digest)
              throw new Error('Proof material integrity check failed');
            if (!entries.has(entry.ref.id) || !entry.leases.has(session))
              throw new Error(
                'Proof material upload was released during validation',
              );
            entry.ready = true;
            entry.validating = false;
          } catch (error) {
            entries.delete(entry.ref.id);
            throw error;
          }
        }
      } else if (command.operation === 'read') {
        if (
          !entry.ready ||
          !Number.isSafeInteger(command.offset) ||
          command.offset < 0 ||
          command.offset >= entry.ref.size
        )
          throw new Error('Invalid proof result offset');
        return {
          ref: entry.ref,
          ready: true,
          hex: hex(
            entry.bytes.subarray(command.offset, command.offset + CHUNK_BYTES),
          ),
        };
      } else throw new Error('Unknown proof material operation');
      return { ref: entry.ref, ready: entry.ready };
    },
  };
};

export const createByteClient = (
  send: (operation: ByteOperation) => Promise<ByteReply>,
) => ({
  upload: async (bytes: Uint8Array): Promise<ByteRef> => {
    // Recompute content identity each time: callback-owned buffers may have changed.
    const hash = await digest(bytes);
    const begun = await send({
      operation: 'upload',
      size: bytes.length,
      digest: hash,
    });
    if (begun.ready) return begun.ref;
    for (let offset = 0; offset < bytes.length; offset += CHUNK_BYTES)
      await send({
        operation: 'chunk',
        ref: begun.ref.id,
        offset,
        hex: hex(bytes.subarray(offset, offset + CHUNK_BYTES)),
      });
    const committed = await send({ operation: 'commit', ref: begun.ref.id });
    if (!committed.ready)
      throw new Error('Proof material upload did not complete');
    return committed.ref;
  },
  download: async (ref: ByteRef): Promise<Uint8Array> => {
    if (
      !Number.isSafeInteger(ref.size) ||
      ref.size < 0 ||
      ref.size > 256 * 1024 * 1024
    )
      throw new Error('Invalid proof result size');
    const bytes = new Uint8Array(ref.size);
    for (let offset = 0; offset < ref.size; offset += CHUNK_BYTES) {
      const reply = await send({ operation: 'read', ref: ref.id, offset });
      const chunk = unhex(reply.hex ?? '');
      if (chunk.length !== Math.min(CHUNK_BYTES, ref.size - offset))
        throw new Error('Incomplete proof result');
      bytes.set(chunk, offset);
    }
    if ((await digest(bytes)) !== ref.digest)
      throw new Error('Proof result integrity check failed');
    return bytes;
  },
});
