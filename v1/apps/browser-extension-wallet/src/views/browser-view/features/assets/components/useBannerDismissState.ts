import { useEffect, useState } from 'react';
import { storage } from 'webextension-polyfill';
import { MidnightEventBannerStorage } from '@lib/scripts/types';
import { FeatureFlag, FeatureFlagPayloads } from '@lib/scripts/types/feature-flags';
import { usePostHogClientContext } from '@providers/PostHogClientProvider';

interface BannerDismissState {
  isLoading: boolean;
  isDialogOpen: boolean;
  data: MidnightEventBannerStorage;
}

interface UseBannerDismissStateReturn<T extends FeatureFlag> {
  isVisible: boolean;
  isDialogOpen: boolean;
  data: MidnightEventBannerStorage;
  handleDialog: (isOpen: boolean) => void;
  hideBanner: () => Promise<void>;
  updateState: (data: MidnightEventBannerStorage) => Promise<void>;
  featureFlagPayload: FeatureFlagPayloads[T];
}

export const useBannerDismissState = <T extends FeatureFlag>(
  storageKey: string,
  featureFlag: T,
  additionalShouldHide?: (data: MidnightEventBannerStorage) => boolean
): UseBannerDismissStateReturn<T> => {
  const [state, setState] = useState<BannerDismissState>({
    isLoading: true,
    isDialogOpen: false,
    data: undefined
  });
  const posthog = usePostHogClientContext();

  const isFeatureEnabled = posthog?.isFeatureFlagEnabled(featureFlag);
  const featureFlagPayload = posthog.getFeatureFlagPayload(featureFlag);

  useEffect(() => {
    const loadStorage = async () => {
      const data = await storage.local.get(storageKey);

      setState({
        isLoading: false,
        isDialogOpen: false,
        data: data[storageKey] ?? { lastSeen: 0, closed: false }
      });
    };

    loadStorage();
  }, [storageKey]);

  const shouldHide = (): boolean => {
    if (!isFeatureEnabled) return true;
    if (state.isLoading) return true;
    if (state.data.closed) return true;
    if (additionalShouldHide?.(state.data)) return true;
    return false;
  };

  const updateState = async (data: MidnightEventBannerStorage) => {
    await storage.local.set({ [storageKey]: data });
    setState((s) => ({ ...s, data }));
  };

  const hideBanner = async () => {
    await updateState({ ...state.data, closed: true });
  };

  const handleDialog = (isOpen: boolean) => {
    setState((s) => ({ ...s, isDialogOpen: isOpen }));
  };

  return {
    isVisible: !shouldHide(),
    isDialogOpen: state.isDialogOpen,
    data: state.data,
    handleDialog,
    hideBanner,
    updateState,
    featureFlagPayload
  };
};
