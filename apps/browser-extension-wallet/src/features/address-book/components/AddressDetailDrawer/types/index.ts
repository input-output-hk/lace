import { TranslationKey } from '@lib/translations/types';

export enum AddressDetailsSteps {
  DETAILS,
  CREATE,
  EDIT
}

export interface AddressDetailsSectionConfig {
  currentSection: AddressDetailsSteps;
  nextSection?: AddressDetailsSteps;
  prevSection?: AddressDetailsSteps;
  headerTitle?: TranslationKey;
  headerSubtitle?: TranslationKey;
}

export type AddressDetailsConfig = Partial<Record<AddressDetailsSteps, AddressDetailsSectionConfig>>;
