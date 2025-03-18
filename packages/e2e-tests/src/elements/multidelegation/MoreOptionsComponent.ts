import { SortingOption } from './SortingOption';
import { StakePoolSortingOption } from '../../enums/StakePoolSortingOption';
import { scrollToTheTop } from '../../utils/scrollUtils';

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

  async getSortingOptionOrderButton(sortingOption: StakePoolSortingOption, order: 'ascending' | 'descending') {
    return $(this.getSortingOptionButtonSelector(sortingOption, order));
  }

  async hoverOverSortingOption(sortingOption: StakePoolSortingOption) {
    switch (sortingOption) {
      case StakePoolSortingOption.Ticker:
        await this.tickerOption.label.moveTo();
        break;
      case StakePoolSortingOption.Saturation:
        await this.saturationOption.label.moveTo();
        break;
      case StakePoolSortingOption.ROS:
        await this.rosOption.label.moveTo();
        break;
      case StakePoolSortingOption.Cost:
        await this.costOption.label.moveTo();
        break;
      case StakePoolSortingOption.Margin:
        await this.marginOption.label.moveTo();
        break;
      case StakePoolSortingOption.ProducedBlocks:
        await this.blocksOption.label.moveTo();
        break;
      case StakePoolSortingOption.Pledge:
        await this.pledgeOption.label.moveTo();
        break;
      case StakePoolSortingOption.LiveStake:
        await this.liveStakeOption.label.moveTo();
        break;
      default:
        throw new Error(`Unsupported sorting option: ${sortingOption}`);
    }
  }

  async selectSortingOption(sortingOption: StakePoolSortingOption) {
    switch (sortingOption) {
      case StakePoolSortingOption.Ticker:
        await this.tickerOption.radioButton.click();
        break;
      case StakePoolSortingOption.Saturation:
        await this.saturationOption.radioButton.click();
        break;
      case StakePoolSortingOption.ROS:
        await this.rosOption.radioButton.click();
        break;
      case StakePoolSortingOption.Cost:
        await this.costOption.radioButton.click();
        break;
      case StakePoolSortingOption.Margin:
        await this.marginOption.radioButton.click();
        break;
      case StakePoolSortingOption.ProducedBlocks:
        await this.blocksOption.radioButton.click();
        break;
      case StakePoolSortingOption.Pledge:
        await this.pledgeOption.radioButton.click();
        break;
      case StakePoolSortingOption.LiveStake:
        await this.liveStakeOption.radioButton.click();
        break;
      default:
        throw new Error(`Unsupported sorting option: ${sortingOption}`);
    }
  }

  private getSortingOptionButtonSelector(
    sortingOption: StakePoolSortingOption,
    order: 'ascending' | 'descending'
  ): string {
    const orderSelector = order === 'ascending' ? '[data-testid="sort-asc"]' : '[data-testid="sort-desc"]';
    const selectorTemplate = `#radio-btn-sorting-id-###option### ${orderSelector}`;
    let option;
    switch (sortingOption) {
      case StakePoolSortingOption.Ticker:
      case StakePoolSortingOption.Saturation:
      case StakePoolSortingOption.ROS:
      case StakePoolSortingOption.Cost:
      case StakePoolSortingOption.Margin:
      case StakePoolSortingOption.Pledge:
        option = String(sortingOption).toLowerCase();
        break;
      case StakePoolSortingOption.ProducedBlocks:
        option = 'blocks';
        break;
      case StakePoolSortingOption.LiveStake:
        option = 'liveStake';
        break;
      default:
        throw new Error(`Unsupported sorting option: ${sortingOption}`);
    }
    return selectorTemplate.replace('###option###', option);
  }

  async clickOnOrderButtonForSortingOption(order: 'ascending' | 'descending', sortingOption: StakePoolSortingOption) {
    await scrollToTheTop();
    const selector = this.getSortingOptionButtonSelector(sortingOption, order);
    await $(selector).moveTo();
    await $(selector).click();
  }
}

export default new MoreOptionsComponent();
