import { useCommonOutsideHandles } from '../../features/common-outside-handles-provider';

import type { Events } from './events';

export const useCaptureEvent = () => {
  const { sendEventToPostHog } = useCommonOutsideHandles();

  return async (event: Events): Promise<void> => {
    await sendEventToPostHog(event);
  };
};
