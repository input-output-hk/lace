class CookiePolicyDrawer {
  private readonly DRAWER_NAVIGATION_TITLE = '[data-testid="drawer-navigation-title"]';
  private readonly DRAWER_NAVIGATION_BUTTON_CROSS = '[data-testid="navigation-button-cross"]';
  private readonly DRAWER_NAVIGATION_BUTTON_ARROW = '[data-testid="navigation-button-arrow"]';
  private readonly DRAWER_HEADER_TITLE = '[data-testid="drawer-header-title"]';
  private readonly COOKIE_POLICY_CONTENT = '[data-testid="cookie-policy-content"]';

  get drawerNavigationTitle() {
    return $(this.DRAWER_NAVIGATION_TITLE);
  }

  get crossButton() {
    return $(this.DRAWER_NAVIGATION_BUTTON_CROSS);
  }

  get backButton() {
    return $(this.DRAWER_NAVIGATION_BUTTON_ARROW);
  }

  get drawerHeaderTitle() {
    return $(this.DRAWER_HEADER_TITLE);
  }

  get cookiePolicyContent() {
    return $(this.COOKIE_POLICY_CONTENT);
  }
}

export default new CookiePolicyDrawer();
