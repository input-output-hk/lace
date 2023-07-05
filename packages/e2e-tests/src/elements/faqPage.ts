class FaqPage {
  private PAGE_TITLE = 'h1';
  private ACTIVE_ARTICLE = 'div[data-active="true"]';
  private ACTIVE_ARTICLE_TITLE = `${this.ACTIVE_ARTICLE} span`;

  get pageTitle() {
    return $(this.PAGE_TITLE);
  }
  get activeArticle() {
    return $(this.ACTIVE_ARTICLE);
  }

  get activeArticleTitle() {
    return $(this.ACTIVE_ARTICLE_TITLE);
  }
}

export default new FaqPage();
