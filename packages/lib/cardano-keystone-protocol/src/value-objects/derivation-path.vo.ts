import type { Tagged } from 'type-fest';

/** Maximum value of a single derivation path component (fits in 32 bits). */
export const MAX_PATH_COMPONENT = 0xff_ff_ff_ff;

/** Offset added to an index to mark it hardened (2^31). */
export const HARDENED_OFFSET = 0x80_00_00_00;

/** CIP-1852 purpose value (1852). */
export const PURPOSE_CIP1852 = 1852;

/** CIP-1852 coin type for ADA (1815). */
export const COIN_TYPE_ADA = 1815;

/**
 * A BIP-32 / CIP-1852 derivation path as a list of unsigned 32-bit component
 * indices. Hardened components carry the {@link HARDENED_OFFSET}.
 */
export type DerivationPath = Tagged<readonly number[], 'DerivationPath'>;

const assertPath = (components: readonly number[]): void => {
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

/**
 * Formats a path in the m/44'/... notation the Keystone registries expect,
 * with hardened components marked by an apostrophe.
 */
DerivationPath.toPathString = (path: DerivationPath): string => {
  const components = path.map(component =>
    component >= HARDENED_OFFSET
      ? `${component - HARDENED_OFFSET}'`
      : `${component}`,
  );
  return ['m', ...components].join('/');
};
