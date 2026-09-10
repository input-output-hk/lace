/**
 * Deep imports of components that are INTERNAL to a template (not re-exported
 * by the package barrel, and adding a barrel export used only by tests is
 * disallowed).
 *
 * The side-effect barrel import MUST come first: design-tokens and
 * design-system are circularly dependent, and entering the graph through a
 * deep path evaluates design-system/atoms before design-tokens' `spacing`
 * exists (`spacing.S` → undefined at module load). Initializing through the
 * barrel first reproduces the app's own import order, where the cycle is
 * harmless.
 */
import '../src';

export { EpochsRewards } from '../src/design-system/templates/sheets/regularPoolSheet/EpochsRewards';
