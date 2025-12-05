class LearnVideoPage {
  async getVideoByTitle(title: string) {
    return $(`iframe[title="${title}"]`);
  }
}

export default new LearnVideoPage();
