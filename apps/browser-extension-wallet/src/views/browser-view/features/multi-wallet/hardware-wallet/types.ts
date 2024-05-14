import { Subject } from 'rxjs';

export interface Providers {
  shouldShowConfirmationDialog$: Subject<boolean>;
}

export enum ErrorDialogCode {
  DeviceDisconnected = 'DeviceDisconnected',
  PublicKeyExportRejected = 'PublicKeyExportRejected',
  Generic = 'Generic'
}
