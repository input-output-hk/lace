import type { SortingOrder } from '../types/sortingOrder';
import { StakePoolSortingOption } from '../enums/StakePoolSortingOption';
import {
  sortContentByBlocks,
  sortContentByTicker,
  sortContentWithAbbreviatedNumbers,
  sortContentWithPercentageValues
} from './stakePoolListContent';

export const sortGridContent = async (
  gridContent: string[],
  sortingOption: StakePoolSortingOption,
  order: SortingOrder
): Promise<string[]> => {
  let sortedGridContent: string[] = [];

  switch (sortingOption) {
    case StakePoolSortingOption.Ticker:
      sortedGridContent = sortContentByTicker(gridContent, order);
      break;
    case StakePoolSortingOption.Saturation:
    case StakePoolSortingOption.ROS:
    case StakePoolSortingOption.Margin:
      sortedGridContent = sortContentWithPercentageValues(gridContent, order);
      break;
    case StakePoolSortingOption.ProducedBlocks:
      sortedGridContent = sortContentByBlocks(gridContent, order);
      break;
    case StakePoolSortingOption.Cost:
    case StakePoolSortingOption.Pledge:
    case StakePoolSortingOption.LiveStake:
      sortedGridContent = sortContentWithAbbreviatedNumbers(gridContent, order);
      break;
    default:
      throw new Error(`Unsupported sorting option: ${sortingOption}`);
  }

  return sortedGridContent;
};
