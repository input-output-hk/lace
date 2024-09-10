import { SimpleSectionsConfig } from '../../stores/sections-store';
import { Sections } from './types';

const makeSectionsConfig = (
  entrySection: Sections.FORM | Sections.IMPORT_SHARED_WALLET_TRANSACTION_JSON
): SimpleSectionsConfig<Sections> => ({
  [entrySection]: {
    currentSection: entrySection,
    nextSection: Sections.SUMMARY
  },
  [Sections.SUMMARY]: {
    currentSection: Sections.SUMMARY,
    nextSection: Sections.CONFIRMATION,
    prevSection: entrySection
  },
  [Sections.CONFIRMATION]: {
    currentSection: Sections.CONFIRMATION,
    prevSection: Sections.SUMMARY
  },
  [Sections.ADDRESS_LIST]: {
    currentSection: Sections.ADDRESS_LIST,
    nextSection: Sections.FORM,
    prevSection: Sections.FORM
  },
  [Sections.ADDRESS_FORM]: {
    currentSection: Sections.ADDRESS_FORM,
    nextSection: Sections.FORM,
    prevSection: Sections.FORM
  }
});

export const sectionsConfig = makeSectionsConfig(Sections.FORM);

export const sharedWalletCoSignSectionsConfig = makeSectionsConfig(Sections.IMPORT_SHARED_WALLET_TRANSACTION_JSON);

export const METADATA_MAX_LENGTH = 160;
export const MAX_NFT_TICKER_LENGTH = 10;
export const MAX_TOKEN_TICKER_LENGTH = 5;
