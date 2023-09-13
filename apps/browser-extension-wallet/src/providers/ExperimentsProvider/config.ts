import { ExperimentName, ExperimentsConfig, FallbackConfiguration } from './types';

export const fallbackConfiguration: FallbackConfiguration = {
  [ExperimentName.NFT_FOLDER]: 'control',
  [ExperimentName.NFT_FOLDER_BUTTON_ALIGNMENT]: 'control'
};

export const experiments: ExperimentsConfig = {
  NftFolders: {
    variants: ['control', 'test'],
    defaultVariant: 'control'
  },
  NFTFolderButtonAlignment: {
    variants: ['control', 'left'],
    defaultVariant: 'control'
  }
};
