// The stable SDK build resolves this file in place of sdk-extensions.ts: the
// stable SDK carries none of the features the canary build adds, so its
// Cardano module runs none of their side effects.
import type { SideEffect } from '../contracts';

export const sdkExtensionSideEffects: SideEffect[] = [];
