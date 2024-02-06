export enum ValidationStatus {
  Idle = 'Idle',
  Validading = 'Validading',
  Validated = 'Validated',
}

export interface SuggestionBaseType {
  value: string;
}

export interface SuggestionClassicType extends SuggestionBaseType {
  label?: string;
}

export interface Suggestion3ItemType extends SuggestionBaseType {
  title: string;
  description: string;
}
