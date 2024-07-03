export enum FileErrorMessage {
  INVALID_KEYS = 'Invalid keys',
  UNRECOGNIZED = 'File is unrecognized',
}

export interface FileValidationError extends Error {
  message: FileErrorMessage;
}

export enum SharedWalletRestorationStep {
  Done = 'Done',
  Import = 'Import',
}
