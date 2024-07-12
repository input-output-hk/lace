import type { Events, Properties } from './events';

export const useCaptureEvent = () => {
  return async (event: Events, properties: Properties = {}): Promise<void> => {
    await Promise.resolve({ event, properties });
  };
};
