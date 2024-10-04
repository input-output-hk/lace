import { useOutsideHandles } from '../../features/outside-handles-provider/useOutsideHandles';

import type { Events } from './events';

export const useCaptureEvent = () => {
  const { sendEventToPostHog } = useOutsideHandles();

  return async (event: Events): Promise<void> => {
    await sendEventToPostHog(event);
  };
};
