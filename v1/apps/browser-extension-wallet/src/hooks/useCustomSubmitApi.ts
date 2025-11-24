import { useLocalStorage } from '@hooks/useLocalStorage';
import { EnvironmentTypes } from '@stores';
import { CustomSubmitApiConfig } from '@types';

interface useCustomSubmitApiReturn {
  getCustomSubmitApiForNetwork: (network: EnvironmentTypes) => CustomSubmitApiConfig;
  updateCustomSubmitApi: (network: EnvironmentTypes, data: CustomSubmitApiConfig) => void;
}

export const useCustomSubmitApi = (): useCustomSubmitApiReturn => {
  const [isCustomSubmitApiEnabled, { updateLocalStorage: updateCustomSubmitApiEnabled }] =
    useLocalStorage('isCustomSubmitApiEnabled');

  const getCustomSubmitApiForNetwork = (network: EnvironmentTypes) => {
    const networkConfig = isCustomSubmitApiEnabled?.[network];
    const status = networkConfig?.status || false;
    const url = networkConfig?.url || '';
    return { status, url };
  };

  const updateCustomSubmitApi = (network: EnvironmentTypes, data: CustomSubmitApiConfig) => {
    updateCustomSubmitApiEnabled({ ...isCustomSubmitApiEnabled, [network]: data });
  };

  return { getCustomSubmitApiForNetwork, updateCustomSubmitApi };
};
