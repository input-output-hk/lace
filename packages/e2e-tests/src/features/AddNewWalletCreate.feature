@AddNewWalletCreate @Testnet @Mainnet
Feature: Add new wallet - Create wallet

  Background:
    Given Lace is ready for test

  @LW-9334
  Scenario: Extended-view - Multi-wallet - "Add new wallet" option click in user menu
    When I open header menu
    And I click on "Add new wallet" option
    Then I see onboarding main screen within modal over the active Lace page in expanded view

  @LW-9335
  Scenario: Popup-view - Multi-wallet - "Add new wallet" option click in user menu
    When I navigate to home page on popup view
    And I open header menu
    And I click on "Add new wallet" option
    And I switch to last window
    Then I see onboarding main screen within modal over the active Lace page in expanded view
