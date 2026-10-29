import type { Tagged } from 'type-fest';

/** Identifies one app view, such as a browser tab, popup window, side panel or the mobile app. */
export type ViewId = Tagged<number | string, 'ViewId'>;
/** Types a string or number as a view's identifier. It checks nothing. */
export const ViewId = (viewId: number | string) => viewId as ViewId;
