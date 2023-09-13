export enum ExperimentsConfigStatus {
  IDLE = 'idle',
  LOADING = 'loading',
  LOADED = 'loaded',
  ERROR = 'error'
}

export enum ExperimentName {
  NFT_FOLDER = 'NftFolders',
  NFT_FOLDER_BUTTON_ALIGNMENT = 'NFTFolderButtonAlignment'
}

export type NFTFolderVariants = readonly ['control', 'test'];
export type NFTFolderButtonAlignmentVariants = ['control', 'left'];
export type ExperimentsConfig = {
  [ExperimentName.NFT_FOLDER]: {
    variants: NFTFolderVariants;
    defaultVariant: string;
  };
  [ExperimentName.NFT_FOLDER_BUTTON_ALIGNMENT]: {
    variants: NFTFolderButtonAlignmentVariants;
    defaultVariant: string;
  };
};
export type FallbackConfiguration = Record<ExperimentName, 'control'>;
