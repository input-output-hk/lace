import { createContext } from 'react';

/**
 * Resolves the on-screen Y position (dp) of the currently focused native
 * sheet, or `undefined` when no sheet is presented.
 *
 * On Android's new architecture, measurement APIs resolve from the shadow
 * tree, which lays sheet content out as if it filled the screen from y=0 and
 * does not know where TrueSheet natively positions the sheet. Overlays
 * presented in a Modal window (e.g. DropdownMenu's expanded list) call this
 * to offset their measured anchors into real screen space.
 */
export type SheetPositionSource = {
  getSheetTop: () => number | undefined;
};

export const SheetPositionContext = createContext<SheetPositionSource | null>(
  null,
);
