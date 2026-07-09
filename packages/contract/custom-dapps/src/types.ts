import type { CustomDappId } from './value-objects';

export type CustomDapp = {
  id: CustomDappId;
  name: string;
  url: string;
  addedAt: number;
};
