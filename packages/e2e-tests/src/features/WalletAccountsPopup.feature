@Runner4 @Accounts-Popup @Testnet
Feature: Wallet accounts

  Background:
    Given Wallet is synced

  @LW-9318 @LW-9320 @LW-9321
  Scenario: Popup View - Accounts menu displayed
    When I click the menu button
    And I click on chevron for wallet number 1
    Then "Accounts" menu is displayed
    And I see 24 accounts on the list
    And each account item contains icon, logo and path

  @LW-9319
  Scenario: Popup View - Accounts menu - Click on back button
    When I click the menu button
    And I click on chevron for wallet number 1
    And I click on back arrow button on "Accounts" menu
    Then "Accounts" menu is not displayed
    And the user menu is displayed
