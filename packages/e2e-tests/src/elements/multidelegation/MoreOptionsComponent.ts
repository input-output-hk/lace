import { SortingOption } from './SortingOption';
import { StakePoolSortingOptionType } from '../../types/staking';

class MoreOptionsComponent {
  private MORE_OPTIONS_LABEL = '[data-testid="stake-pools-more-options-label"]';
  private SORTING_TOGGLE = '[data-testid="stake-pools-sorting-toggle"]';
  private FILTERS_TOGGLE = '[data-testid="stake-pools-filters-toggle"]';
  private SATURATION_FILTER_LABEL = '[data-testid="filter-Saturation-label"]';
  private PROFIT_MARGIN_FILTER_LABEL = '[data-testid="filter-ProfitMargin-label"]';
  private PERFORMANCE_FILTER_LABEL = '[data-testid="filter-Performance-label"]';
  private ROS_FILTER_LABEL = '[data-testid="filter-Ros-label"]';

  get moreOptionsLabel() {
    return $(this.MORE_OPTIONS_LABEL);
  }

  get sortingToggle() {
    return $(this.SORTING_TOGGLE);
  }

  get filtersToggle() {
    return $(this.FILTERS_TOGGLE);
  }

  get tickerOption() {
    return new SortingOption('ticker');
  }

  get saturationOption() {
    return new SortingOption('saturation');
  }

  get rosOption() {
    return new SortingOption('ros');
  }

  get costOption() {
    return new SortingOption('cost');
  }

  get marginOption() {
    return new SortingOption('margin');
  }

  get blocksOption() {
    return new SortingOption('blocks');
  }

  get pledgeOption() {
    return new SortingOption('pledge');
  }

  get liveStakeOption() {
    return new SortingOption('liveStake');
  }

  get saturationFilterLabel() {
    return $(this.SATURATION_FILTER_LABEL);
  }

  get profitMarginFilterLabel() {
    return $(this.PROFIT_MARGIN_FILTER_LABEL);
  }

  get performanceFilterLabel() {
    return $(this.PERFORMANCE_FILTER_LABEL);
  }

  get rosFilterLabel() {
    return $(this.ROS_FILTER_LABEL);
  }

  async selectSortingOption(sortingOption: StakePoolSortingOptionType) {
    switch (sortingOption) {
      case 'Ticker':
        await this.tickerOption.radioButton.click();
        break;
      case 'Saturation':
        await this.saturationOption.radioButton.click();
        break;
      case 'ROS':
        await this.rosOption.radioButton.click();
        break;
      case 'Cost':
        await this.costOption.radioButton.click();
        break;
      case 'Margin':
        await this.marginOption.radioButton.click();
        break;
      case 'Produced blocks':
        await this.blocksOption.radioButton.click();
        break;
      case 'Pledge':
        await this.pledgeOption.radioButton.click();
        break;
      case 'Live Stake':
        await this.liveStakeOption.radioButton.click();
        break;
      default:
        throw new Error(`Unsupported column name: ${sortingOption}`);
    }
  }
}

export default new MoreOptionsComponent();
