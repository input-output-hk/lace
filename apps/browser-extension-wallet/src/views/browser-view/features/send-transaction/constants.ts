import { SimpleSectionsConfig, Sections } from './types';

export const defaultOutputKey = 'output1';

export const sectionsConfig: SimpleSectionsConfig = {
  [Sections.FORM]: {
    currentSection: Sections.FORM,
    nextSection: Sections.SUMMARY
  },
  [Sections.SUMMARY]: {
    currentSection: Sections.SUMMARY,
    nextSection: Sections.CONFIRMATION,
    prevSection: Sections.FORM
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
};

export const METADATA_MAX_LENGTH = 160;
