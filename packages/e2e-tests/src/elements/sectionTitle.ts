class SectionTitle {
  private SECTION_TITLE = '[data-testid="section-title"]';
  private SECTION_COUNTER = '[data-testid="section-title-counter"]';

  get sectionTitle() {
    return $(this.SECTION_TITLE);
  }

  get sectionCounter() {
    return $(this.SECTION_COUNTER);
  }
}

export default new SectionTitle();
