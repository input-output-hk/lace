class HelpAndSupportPage {
  private BREADCRUMB_PART_1 = 'li[title="IOHK Support"]';
  private BREADCRUMB_PART_2 = 'li[title="Submit a request"]';

  get breadcrumbPart1() {
    return $(this.BREADCRUMB_PART_1);
  }

  get breadcrumbPart2() {
    return $(this.BREADCRUMB_PART_2);
  }
}

export default new HelpAndSupportPage();
