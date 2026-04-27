import type { Tagged } from 'type-fest';

export type ViewId = Tagged<number | string, 'ViewId'>;
export const ViewId = (viewId: number | string) => viewId as ViewId;
