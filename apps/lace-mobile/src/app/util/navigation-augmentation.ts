import type {
  DappConnectorSheetParams,
  SelectAccountSheetParams,
} from '@lace-lib/ui-toolkit';

declare module '@lace-lib/navigation' {
  interface ExtendableSheetParams {
    DappConnector: DappConnectorSheetParams;
    SelectAccount: SelectAccountSheetParams;
  }
}
