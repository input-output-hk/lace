import CommonDrawerElements from '../CommonDrawerElements';

class CookiePolicyDrawer extends CommonDrawerElements {
  private readonly COOKIE_POLICY_CONTENT = '[data-testid="cookie-policy-content"]';

  get cookiePolicyContent() {
    return $(this.COOKIE_POLICY_CONTENT);
  }
}

export default new CookiePolicyDrawer();
