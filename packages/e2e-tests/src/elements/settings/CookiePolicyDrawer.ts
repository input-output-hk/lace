import CommonDrawerElements from '../CommonDrawerElements';

class CookiePolicyDrawer extends CommonDrawerElements {
  private readonly DRAWER_NAVIGATION_BUTTON_CROSS = '[data-testid="navigation-button-cross"]';
  private readonly DRAWER_NAVIGATION_BUTTON_ARROW = '[data-testid="navigation-button-arrow"]';
  private readonly COOKIE_POLICY_CONTENT = '[data-testid="cookie-policy-content"]';

  get crossButton() {
    return $(this.DRAWER_NAVIGATION_BUTTON_CROSS);
  }

  get backButton() {
    return $(this.DRAWER_NAVIGATION_BUTTON_ARROW);
  }

  get cookiePolicyContent() {
    return $(this.COOKIE_POLICY_CONTENT);
  }
}

export default new CookiePolicyDrawer();
