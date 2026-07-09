/**
 * Compile-time parity check between this lib's route enums and the
 * duplicates owned by `@lace-contract/account-management` (see ADR 28 —
 * contracts must be UI-agnostic, so the contract owns its own copy of
 * these string enums instead of importing from this lib).
 *
 * If the navigation lib adds or removes a route, this file fails to
 * type-check until the contract is updated to match.
 */

import type { SheetRoutes, StackRoutes, TabRoutes } from './routes';
import type {
  SheetRoutes as ContractSheetRoutes,
  StackRoutes as ContractStackRoutes,
  TabRoutes as ContractTabRoutes,
} from '@lace-contract/account-management';

type AssertEqual<A extends string, B extends string> = [A, B] extends [B, A]
  ? true
  : { LibOnly: Exclude<A, B>; ContractOnly: Exclude<B, A> };

type AssertTrue<T extends true> = T;

// Each field instantiates `AssertTrue` with an `AssertEqual` result. If any
// enum diverges, `AssertEqual` resolves to an object type that fails the
// `extends true` constraint, producing a compile error at the field type.
type RouteParityCheck = {
  tab: AssertTrue<AssertEqual<`${TabRoutes}`, `${ContractTabRoutes}`>>;
  stack: AssertTrue<AssertEqual<`${StackRoutes}`, `${ContractStackRoutes}`>>;
  sheet: AssertTrue<AssertEqual<`${SheetRoutes}`, `${ContractSheetRoutes}`>>;
};

export type { RouteParityCheck };
