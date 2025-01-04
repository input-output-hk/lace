export interface ITag {
  label: string;
  value: string;
  'data-testid': string;
}

export interface ISimpleViewFilters {
  data?: ITag[];
  onChangeCategory?: (value: string) => void;
}
