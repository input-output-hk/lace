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

export interface SuggestionThreeItemType extends SuggestionBaseType {
  title: string;
  description: string;
}

export type SuggestionType = SuggestionClassicType | SuggestionThreeItemType;
