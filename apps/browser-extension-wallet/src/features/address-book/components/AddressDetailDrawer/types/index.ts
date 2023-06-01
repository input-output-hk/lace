export enum AddressDetailsSteps {
  DETAILS,
  CREATE,
  EDIT
}

export interface AddressDetailsSectionConfig {
  currentSection: AddressDetailsSteps;
  nextSection?: AddressDetailsSteps;
  prevSection?: AddressDetailsSteps;
}

export type AddressDetailsConfig = Partial<Record<AddressDetailsSteps, AddressDetailsSectionConfig>>;
