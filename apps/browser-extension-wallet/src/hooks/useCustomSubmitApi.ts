import { useLocalStorage } from '@hooks/useLocalStorage';
import { EnvironmentTypes } from '@stores';
import { CustomBackendApiConfig } from '@types';

interface useCustomSubmitApiReturn {
  getCustomSubmitApiForNetwork: (network: EnvironmentTypes) => CustomBackendApiConfig;
  updateCustomSubmitApi: (network: EnvironmentTypes, data: CustomBackendApiConfig) => void;
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

  const updateCustomSubmitApi = (network: EnvironmentTypes, data: CustomBackendApiConfig) => {
    updateCustomSubmitApiEnabled({ ...isCustomSubmitApiEnabled, [network]: data });
  };

  return { getCustomSubmitApiForNetwork, updateCustomSubmitApi };
};

interface useCustomBackendConfigurationApiReturn {
  getCustomBackendApiForNetwork: (network: EnvironmentTypes) => CustomBackendApiConfig;
  updateCustomBackendApi: (network: EnvironmentTypes, data: CustomBackendApiConfig) => void;
}

export const useCustomBackendApi = (): useCustomBackendConfigurationApiReturn => {
  const [isCustomBackendApiEnabled, { updateLocalStorage: updateCustomBackendApiEnabled }] =
    useLocalStorage('isCustomBackendApiEnabled');

  const getCustomBackendApiForNetwork = (network: EnvironmentTypes) => {
    const networkConfig = isCustomBackendApiEnabled?.[network];
    const status = networkConfig?.status || false;
    const url = networkConfig?.url || '';
    return { status, url };
  };

  const updateCustomBackendApi = (network: EnvironmentTypes, data: CustomBackendApiConfig) => {
    updateCustomBackendApiEnabled({ ...isCustomBackendApiEnabled, [network]: data });
  };

  return { getCustomBackendApiForNetwork, updateCustomBackendApi };
};
