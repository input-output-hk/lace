export enum FileErrorMessage {
  INVALID_KEY = 'Invalid key',
  UNRECOGNIZED = 'File is unrecognized',
}

export interface FileValidationError extends Error {
  message: FileErrorMessage;
}

export enum SharedWalletRestorationStep {
  Done = 'Done',
  Import = 'Import',
}
