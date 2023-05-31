class GlossaryPage {
  private ACTIVE_ARTICLE = 'div[data-active="true"]';
  private ACTIVE_ARTICLE_TITLE = `${this.ACTIVE_ARTICLE} button`;

  get activeArticle() {
    return $(this.ACTIVE_ARTICLE);
  }

  get activeArticleTitle() {
    return $(this.ACTIVE_ARTICLE_TITLE);
  }

  getActiveArticleTitleText() {
    return this.activeArticleTitle.getText();
  }
}

export default new GlossaryPage();
