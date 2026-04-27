import type {
  DappConnectorSheetParams,
  SelectAccountSheetParams,
} from '@lace-lib/ui-toolkit';

/**
 * Augments the navigation library's ExtendableSheetParams interface
 * with feature-specific route parameters that require UI-toolkit types.
 *
 * This pattern keeps the navigation library clean while allowing
 * strongly-typed route parameters for features that depend on UI types.
 */
declare module '@lace-lib/navigation' {
  interface ExtendableSheetParams {
    DappConnector: DappConnectorSheetParams;
    SelectAccount: SelectAccountSheetParams;
  }
}
