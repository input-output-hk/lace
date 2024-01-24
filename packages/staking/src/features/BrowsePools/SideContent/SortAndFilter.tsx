import { CSSProperties, useState } from 'react';
import { Flex, ToggleButtonGroup, Text, Card, TextBox, RadioButtonGroup, SelectGroup } from '@lace/ui';
import * as styles from './SideContent.css';
import { ReactComponent as SortDirectionIcon } from '@lace/icons/dist/SortDirectionComponent';
import { SortDirection } from '../StakePoolsTable/types';
type visibleOptions = 'sorting' | 'filtering';

export interface SortAndFilterProps {
  onSortingChange?: (event: any) => void;
  onFilterChange?: (event: any) => void;
  sortValue?: {
    value: string;
    sortDirection: SortDirection;
  };
  initialSortValue?: string;
  initialFilterValue?: string;
  toggleSection: visibleOptions;
}

type BaseOptions = { label: string; value: string };

type SortOptions = BaseOptions & { icon: any; onIconClick: any };

type Filter = {
  title: string;
  type: 'input' | 'select';
  opts: BaseOptions[];
};

// can this be done with sprinkles?
const groupedTextBoxStyle = (length: number, idx: number): CSSProperties => ({
  ...(length > 0 && {
    ...(idx === 0 && {
      borderTopLeftRadius: 16,
      borderTopRightRadius: 0,
      borderBottomRightRadius: 0,
      borderBottomLeftRadius: 16,
      borderRight: 'red 1px solid',
    }),
    ...(idx > 0 && {
      borderTopLeftRadius: 0,
      borderTopRightRadius: 16,
      borderBottomRightRadius: 16,
      borderBottomLeftRadius: 0,
    }),
  }),
});

const getFilters = (filter: Filter): React.ReactElement => {
  if (filter.type === 'input') {
    return (
      <>
        {filter.opts.map((opt, idx) => (
          <TextBox
            key={idx}
            containerStyle={groupedTextBoxStyle(filter.opts.length, idx)}
            containerClassName={styles.groupedInputContainer}
            label={opt.label}
          ></TextBox>
        ))}
      </>
    );
  } else {
    return (
      <SelectGroup
        onValueChange={() => {}}
        showArrow
        withOutline
        placeholder={filter.opts[0]!.label}
        options={filter.opts}
      />
    );
  }
};

export const SortAndFilter = (props: SortAndFilterProps) => {
  const [selectedSorting, setSelectedSorting] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<SortDirection>(SortDirection.asc);
  const [visibleSection, setVisibleSection] = useState<visibleOptions>(props.toggleSection || 'sorting');

  const onIconClick = () => {
    if (sortDirection === SortDirection.asc) {
      setSortDirection(SortDirection.desc);
    } else {
      setSortDirection(SortDirection.asc);
    }
  };

  const sortingOptions: SortOptions[] = [
    {
      label: 'Ticker name',
      value: 'ticker',
      icon: SortDirectionIcon,
      onIconClick: () => setSortDirection(sortDirection === SortDirection.asc ? SortDirection.desc : SortDirection.asc),
    },
    { label: 'Saturation', value: 'saturation', icon: SortDirectionIcon, onIconClick: () => onIconClick },
    { label: 'ROS', value: 'ros', icon: SortDirectionIcon, onIconClick: () => onIconClick },
    { label: 'Cost', value: 'cost', icon: SortDirectionIcon, onIconClick: () => onIconClick },
    { label: 'Margin', value: 'margin', icon: SortDirectionIcon, onIconClick: () => onIconClick },
    { label: 'Blocks produced', value: 'blocks', icon: SortDirectionIcon, onIconClick: () => onIconClick },
    { label: 'Pledge', value: 'pledge', icon: SortDirectionIcon, onIconClick: () => onIconClick },
    { label: 'Live stake', value: 'livestake', icon: SortDirectionIcon, onIconClick: () => onIconClick },
  ];

  const filterOptions: Filter[] = [
    {
      title: 'Ctrl. Stake',
      type: 'input',
      opts: [
        { label: 'From', value: 'from' },
        { label: 'To', value: 'from' },
      ],
    },
    {
      title: 'Profit Margin',
      type: 'input',
      opts: [
        { label: 'From', value: 'from' },
        { label: 'To', value: 'from' },
      ],
    },
    {
      title: 'Performance',
      type: 'input',
      opts: [
        { label: 'From', value: 'from' },
        { label: 'To', value: 'from' },
      ],
    },
    {
      title: 'ROS',
      type: 'select',
      opts: [
        { label: 'Last epoch', value: 'lastepoch' },
        { label: 'other', value: 'other' },
      ],
    },
  ];
  return (
    <Card.Outlined style={{ width: 340 }}>
      <Flex flexDirection={'column'} justifyContent="flex-start" alignItems="stretch" my="$32" mx="$32" gap="$20">
        <Text.SubHeading weight="$bold">More options</Text.SubHeading>
        <ToggleButtonGroup.Root
          value={visibleSection}
          onValueChange={(value: visibleOptions) => setVisibleSection(value)}
        >
          <ToggleButtonGroup.Item value="sorting">Sorting</ToggleButtonGroup.Item>
          <ToggleButtonGroup.Item value="filtering">Filters</ToggleButtonGroup.Item>
        </ToggleButtonGroup.Root>
        {visibleSection === 'sorting' ? (
          <Flex justifyContent={'flex-start'}>
            <RadioButtonGroup
              options={sortingOptions}
              selectedValue={selectedSorting}
              onValueChange={(e) => setSelectedSorting(e)}
            />
          </Flex>
        ) : (
          <Flex flexDirection={'column'} justifyContent={'stretch'} alignItems={'stretch'}>
            {filterOptions?.map((filter) => (
              <Flex
                flexDirection={'column'}
                justifyContent={'flex-start'}
                alignItems="flex-start"
                h="$fill"
                m="$4"
                key={filter.title}
              >
                <Flex>
                  <Text.Body.Large weight="$medium">{filter.title}</Text.Body.Large>
                </Flex>
                <Flex>{getFilters(filter)}</Flex>
              </Flex>
            ))}
          </Flex>
        )}
      </Flex>
    </Card.Outlined>
  );
};
