export enum ValidationState {
  Idle = 'Idle',
  Validading = 'Validading',
  Validated = 'Validated',
}

export interface SuggestionBase {
  value: string;
}

export interface SuggestionClassic extends SuggestionBase {
  label?: string;
}

export interface Suggestion3Item extends SuggestionBase {
  title: string;
  description: string;
}
