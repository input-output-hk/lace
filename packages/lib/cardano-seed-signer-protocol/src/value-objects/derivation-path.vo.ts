import type { Tagged } from 'type-fest';

/** Maximum number of components in a derivation path (firmware cap). */
export const MAX_PATH_COMPONENTS = 10;

/** Maximum value of a single derivation path component (fits in 32 bits). */
export const MAX_PATH_COMPONENT = 0xff_ff_ff_ff;

/** Offset added to an index to mark it hardened (2^31). */
export const HARDENED_OFFSET = 0x80_00_00_00;

/** CIP-1852 coin type for ADA (1815). */
export const COIN_TYPE_ADA = 1815;

/** CIP-1852 role index for external/internal payment keys. */
export const ROLE_PAYMENT = 0;

/** CIP-1852 role index for the stake key. */
export const ROLE_STAKE = 2;

/** CIP-1852 role index for the DRep key. */
export const ROLE_DREP = 3;

/**
 * A BIP-32 / CIP-1852 derivation path as a list of unsigned 32-bit component
 * indices. Hardened components carry the {@link HARDENED_OFFSET}.
 */
export type DerivationPath = Tagged<readonly number[], 'DerivationPath'>;

const assertPath = (components: readonly number[]): void => {
  if (components.length > MAX_PATH_COMPONENTS) {
    throw new Error(
      `derivation path too long (${components.length} > ${MAX_PATH_COMPONENTS})`,
    );
  }
  for (const component of components) {
    if (
      !Number.isInteger(component) ||
      component < 0 ||
      component > MAX_PATH_COMPONENT
    ) {
      throw new Error(`derivation path component out of range: ${component}`);
    }
  }
};

/** Wraps a list of component indices as a {@link DerivationPath}, validating it. */
export const DerivationPath = (
  components: readonly number[],
): DerivationPath => {
  assertPath(components);
  return components as DerivationPath;
};
