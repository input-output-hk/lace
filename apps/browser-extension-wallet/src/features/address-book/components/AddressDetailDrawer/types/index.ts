export enum AddressDetailsSteps {
  DETAIL = 'detail',
  FORM = 'form'
}

export interface AddressDetailsSectionConfig {
  currentSection: AddressDetailsSteps;
  nextSection?: AddressDetailsSteps;
  prevSection?: AddressDetailsSteps;
}

export type AddressDetailsConfig = Partial<Record<AddressDetailsSteps, AddressDetailsSectionConfig>>;
