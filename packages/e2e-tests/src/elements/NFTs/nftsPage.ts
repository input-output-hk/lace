import SectionTitle from '../sectionTitle';

class NftsPage {
  get title() {
    return SectionTitle.sectionTitle;
  }

  get counter() {
    return SectionTitle.sectionCounter;
  }
}

export default new NftsPage();
