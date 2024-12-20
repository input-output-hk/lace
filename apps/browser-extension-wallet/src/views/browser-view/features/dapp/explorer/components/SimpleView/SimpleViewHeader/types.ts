import { ISectionCard } from '../../../services/helpers/apis-formatter/types';

export interface ISimpleViewHeader {
  filtered: boolean;
  category: ISectionCard;

  totalItems: number;
}
