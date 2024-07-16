import type { SortingOrder } from '../types/sortingOrder';
import type { StakePoolListColumnName, StakePoolSortingOptionType } from '../types/staking';
import { StakePoolListColumn } from '../enums/StakePoolListColumn';
import { StakePoolSortingOption } from '../enums/StakePoolSortingOption';

interface AbbreviatedValue {
  value: number;
  suffix: '-' | 'K' | 'M';
}

const suffixOrderPriority = {
  '-': 0,
  K: 1,
  M: 2
};

const emojiRegex =
  /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g;

export const sortContentByTicker = (columnContent: string[], order: SortingOrder): string[] => {
  const itemsWithNoTicker = columnContent.filter((item) => item === '-');
  const itemsWithTicker = columnContent.filter((item) => item !== '-');

  const sortedItems = [...itemsWithTicker].sort((a, b) => {
    const nameA = a.replace(emojiRegex, '').replace(' ', '').trim();
    const nameB = b.replace(emojiRegex, '').replace(' ', '').trim();
    return nameA.localeCompare(nameB);
  });

  if (order === 'descending') {
    sortedItems.reverse();
  }

  sortedItems.push(...itemsWithNoTicker);

  return sortedItems;
};

export const sortContentByBlocks = (columnContent: string[], order: SortingOrder): string[] => {
  const parsedColumnContent = columnContent.map((item) => Number(item.replace(',', '')));
  const sortedColumnContent = [...parsedColumnContent].sort((a, b) => a - b);

  if (order === 'descending') {
    sortedColumnContent.reverse();
  }

  return sortedColumnContent.map((item) => item.toLocaleString());
};

export const parseValueFromColumnIntoAbbreviatedValueObject = (valueFromColumn: string): AbbreviatedValue => {
  if (valueFromColumn.endsWith('K')) {
    return {
      value: Number(valueFromColumn.slice(0, -1)),
      suffix: 'K'
    };
  }
  if (valueFromColumn.endsWith('M')) {
    return {
      value: Number(valueFromColumn.slice(0, -1)),
      suffix: 'M'
    };
  }
  return {
    value: Number(valueFromColumn),
    suffix: '-'
  };
};

const parseAbbreviatedValueObjectIntoString = (abbreviatedValueObject: AbbreviatedValue): string =>
  `${abbreviatedValueObject.value}${
    ['K', 'M'].includes(abbreviatedValueObject.suffix) ? abbreviatedValueObject.suffix : ''
  }`;

const compareAbbreviatedValues = (abbreviatedValue1: AbbreviatedValue, abbreviatedValue2: AbbreviatedValue): number => {
  if (suffixOrderPriority[abbreviatedValue1.suffix] - suffixOrderPriority[abbreviatedValue2.suffix] === 0) {
    return abbreviatedValue1.value - abbreviatedValue2.value;
  }
  return suffixOrderPriority[abbreviatedValue1.suffix] - suffixOrderPriority[abbreviatedValue2.suffix];
};

export const sortContentWithPercentageValues = (columnContent: string[], order: string): string[] => {
  const parsedColumnContent = columnContent.map((item) => Number(item.replace(/%/, '')).toFixed(2));
  const sortedColumnContent = [...parsedColumnContent].sort((a, b) => Number(a) - Number(b));

  if (order === 'descending') {
    sortedColumnContent.reverse();
  }

  return sortedColumnContent.map((item) => String(`${item}%`));
};

export const sortContentWithAbbreviatedNumbers = (columnContent: string[], order: string): string[] => {
  const parsedColumnContent: AbbreviatedValue[] = columnContent.map((item) =>
    parseValueFromColumnIntoAbbreviatedValueObject(item)
  );
  const sortedColumnContent = [...parsedColumnContent].sort((a, b) => compareAbbreviatedValues(a, b));

  if (order === 'descending') {
    sortedColumnContent.reverse();
  }

  return sortedColumnContent.map((item) => parseAbbreviatedValueObjectIntoString(item));
};

export const sortColumnContent = async (
  columnContent: string[],
  sortingOption: StakePoolListColumn,
  order: SortingOrder
): Promise<string[]> => {
  let sortedColumnContent: string[] = [];

  switch (sortingOption) {
    case StakePoolListColumn.Ticker:
      sortedColumnContent = sortContentByTicker(columnContent, order);
      break;
    case StakePoolListColumn.Saturation:
    case StakePoolListColumn.ROS:
    case StakePoolListColumn.Margin:
      sortedColumnContent = sortContentWithPercentageValues(columnContent, order);
      break;
    case StakePoolListColumn.Blocks:
      sortedColumnContent = sortContentByBlocks(columnContent, order);
      break;
    case StakePoolListColumn.Cost:
    case StakePoolListColumn.Pledge:
    case StakePoolListColumn.LiveStake:
      sortedColumnContent = sortContentWithAbbreviatedNumbers(columnContent, order);
      break;
    default:
      throw new Error(`Unsupported sorting option: ${sortingOption}`);
  }

  return sortedColumnContent;
};

export const mapColumnNameStringToEnum = (columnName: StakePoolListColumnName): StakePoolListColumn =>
  columnName === 'Live Stake'
    ? StakePoolListColumn.LiveStake
    : StakePoolListColumn[columnName as keyof typeof StakePoolListColumn];

export const mapSortingOptionToColumnNameEnum = (sortingOption: StakePoolSortingOption): StakePoolListColumn => {
  if (sortingOption === StakePoolSortingOption.ProducedBlocks) return StakePoolListColumn.Blocks;
  if (sortingOption === StakePoolSortingOption.LiveStake) return StakePoolListColumn.LiveStake;
  return StakePoolListColumn[sortingOption as keyof typeof StakePoolListColumn];
};

export const mapSortingOptionNameStringToEnum = (sortingOption: StakePoolSortingOptionType): StakePoolSortingOption => {
  if (sortingOption === 'Live Stake') return StakePoolSortingOption.LiveStake;
  if (sortingOption === 'Produced blocks') return StakePoolSortingOption.ProducedBlocks;
  return StakePoolSortingOption[sortingOption as keyof typeof StakePoolSortingOption];
};
