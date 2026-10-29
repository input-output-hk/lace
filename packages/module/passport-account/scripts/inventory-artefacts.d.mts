/** Types for inventory-artefacts.mjs, for its TypeScript callers. */

/** Byte size and lowercase hex sha256 of one artefact file. */
export type ArtefactDigest = { bytes: number; sha256: string };

/** The toolchain that compiled the bundle, keyed as `accManifest.toolchain`. */
export type ArtefactToolchain = {
  compactc: string;
  language: string;
  runtime: string;
};

/** The three downloadable artefacts of one circuit. */
export type CircuitInventoryEntry = {
  zkir: ArtefactDigest;
  prover: ArtefactDigest;
  verifier: ArtefactDigest;
};

/** Provenance and per-file digests of one compiled contract bundle. */
export type ArtefactInventory = {
  repository: string;
  contract: string;
  commit: string;
  toolchain: ArtefactToolchain;
  circuits: Record<string, CircuitInventoryEntry>;
};

export const buildInventory: (props: {
  commit: string;
  toolchain: ArtefactToolchain;
  digests: Record<string, ArtefactDigest>;
}) => ArtefactInventory;
