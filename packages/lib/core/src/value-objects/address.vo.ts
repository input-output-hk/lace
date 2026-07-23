/**
 * Blockchain-agnostic address — an opaque, branded string. Lives in core (not the
 * `@lace-contract/addresses` contract) so the framework-free address encoders here
 * can surface return types assignable to it, and blockchain-specific address types
 * (e.g. `CardanoPaymentAddress`) extend it via hierarchical Tagged typing (ADR 13).
 */
import type { Tagged } from '@lace-lib/vendor';

export type Address = Tagged<string, 'Address'>;
