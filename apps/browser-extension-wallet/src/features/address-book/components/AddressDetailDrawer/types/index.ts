export enum AddressDetailsSteps {
  DETAILS,
  CREATE,
  EDIT
}

export interface AddressDetailsSectionConfig {
  currentSection: AddressDetailsSteps;
  nextSection?: AddressDetailsSteps;
  prevSection?: AddressDetailsSteps;
  headerTitle?: string;
  headerSubtitle?: string;
}

export type AddressDetailsConfig = Partial<Record<AddressDetailsSteps, AddressDetailsSectionConfig>>;
