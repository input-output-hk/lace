import type { ByteOperation, ByteRef, ByteReply } from './bytes';

export type CircuitRequest = {
  serializedPreimage: Uint8Array;
  keyLocation: string;
  keyMaterial?: {
    proverKey: Uint8Array;
    verifierKey: Uint8Array;
    ir: Uint8Array;
  };
  overwriteBindingInput?: bigint;
};
/** Providers must release their local resources when an operation is aborted. */
export type CircuitProvider = {
  /** Internal transport lifecycle, after authorization and before material upload. */
  prepare?: (method: JobRequest['method']) => {
    provider: CircuitProvider;
    fail: () => void;
  };
  checkAndProve?(
    request: CircuitRequest,
    signal?: AbortSignal,
  ): Promise<Uint8Array>;
  check(
    request: CircuitRequest,
    signal?: AbortSignal,
  ): Promise<(bigint | undefined)[]>;
  prove(request: CircuitRequest, signal?: AbortSignal): Promise<Uint8Array>;
};
export type ProofStage = {
  phase: 'checking' | 'proving';
  status: 'completed' | 'started';
};
export type ProofProgress =
  | ProofStage
  | {
      phase: 'proof-material';
      status: 'completed' | 'started';
    };
export type JobRequest = {
  method: 'check' | 'checkAndProve' | 'prove';
  circuit: CircuitRequest;
};
export type JobResult = (bigint | undefined)[] | Uint8Array;
export type JobStatus =
  | 'cancelled'
  | 'failed'
  | 'queued'
  | 'receiving'
  | 'running'
  | 'succeeded';
export type WireRequest = {
  method: 'check' | 'checkAndProve' | 'prove';
  circuit: {
    serializedPreimage: ByteRef;
    keyLocation: string;
    keyMaterial?: { proverKey: ByteRef; verifierKey: ByteRef; ir: ByteRef };
    overwriteBindingInput?: string;
  };
};
export type JobSnapshot = {
  id: string;
  status: JobStatus;
  progress?: ProofProgress;
  stage?: ProofStage;
  error?: string;
  result?: { ordinals: (string | null)[] } | { proof: ByteRef };
};
export type ProverCommand = {
  target: 'lace:prover';
  version: 2;
  id: string;
} & (
  | ByteOperation
  | { operation: 'begin'; method: 'check' | 'checkAndProve' | 'prove' }
  | { operation: 'cancel' | 'poll' | 'release' }
  | { operation: 'start'; request: WireRequest }
);
export type ProverReply =
  | { ok: false; error: string }
  | { ok: true; bytes: ByteReply }
  | { ok: true; job: JobSnapshot };

export const encodeRequest = async (
  { method, circuit }: JobRequest,
  upload: (bytes: Uint8Array) => Promise<ByteRef>,
): Promise<WireRequest> => ({
  method,
  circuit: {
    serializedPreimage: await upload(circuit.serializedPreimage),
    keyLocation: circuit.keyLocation,
    ...(circuit.overwriteBindingInput === undefined
      ? {}
      : { overwriteBindingInput: String(circuit.overwriteBindingInput) }),
    ...(circuit.keyMaterial
      ? {
          keyMaterial: {
            proverKey: await upload(circuit.keyMaterial.proverKey),
            verifierKey: await upload(circuit.keyMaterial.verifierKey),
            ir: await upload(circuit.keyMaterial.ir),
          },
        }
      : {}),
  },
});
export const decodeRequest = (
  request: WireRequest,
  pin: (references: ByteRef[]) => Uint8Array[],
): JobRequest => {
  if (
    request.method !== 'check' &&
    request.method !== 'prove' &&
    request.method !== 'checkAndProve'
  )
    throw new Error('Invalid proof method');
  const { circuit } = request;
  if (
    typeof circuit?.keyLocation !== 'string' ||
    !circuit.keyLocation ||
    circuit.keyLocation.length > 4096
  )
    throw new Error('Invalid circuit location');
  if (
    circuit.overwriteBindingInput !== undefined &&
    !/^-?\d{1,256}$/.test(circuit.overwriteBindingInput)
  )
    throw new Error('Invalid binding input');
  const references = [circuit.serializedPreimage];
  if (circuit.keyMaterial)
    references.push(
      circuit.keyMaterial.proverKey,
      circuit.keyMaterial.verifierKey,
      circuit.keyMaterial.ir,
    );
  const [serializedPreimage, proverKey, verifierKey, ir] = pin(references);
  return {
    method: request.method,
    circuit: {
      serializedPreimage,
      keyLocation: circuit.keyLocation,
      ...(circuit.overwriteBindingInput === undefined
        ? {}
        : { overwriteBindingInput: BigInt(circuit.overwriteBindingInput) }),
      ...(circuit.keyMaterial
        ? { keyMaterial: { proverKey, verifierKey, ir } }
        : {}),
    },
  };
};
export const encodeResult = async (
  result: JobResult,
  store: (bytes: Uint8Array) => Promise<ByteRef>,
): Promise<NonNullable<JobSnapshot['result']>> => {
  if (result instanceof Uint8Array) return { proof: await store(result) };
  const ordinals = result.map(value =>
    value === undefined ? null : String(value),
  );
  if (JSON.stringify(ordinals).length > 1024 * 1024)
    throw new Error('Proof check result exceeds the size limit');
  return { ordinals };
};
export const decodeResult = async (
  result: NonNullable<JobSnapshot['result']>,
  download: (ref: ByteRef) => Promise<Uint8Array>,
): Promise<JobResult> =>
  'proof' in result
    ? download(result.proof)
    : result.ordinals.map(value =>
        value === null ? undefined : BigInt(value),
      );
