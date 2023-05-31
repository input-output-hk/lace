import EducationalList from '../elements/educationalList';

class EducationalBannerPageObject {
  async clickItemWithSubtitle(subtitle: string) {
    await (await EducationalList.getListRowWithSubtitle(subtitle)).click();
  }
}

export default new EducationalBannerPageObject();
