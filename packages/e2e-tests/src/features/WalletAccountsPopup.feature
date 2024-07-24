@Accounts-Popup @Testnet
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

  @LW-11024
  Scenario: Popup View - Accounts menu - Account unlock drawer displayed
    Given I click the menu button
    And I click on chevron for wallet number 1
    When I click unlock button: 4
    Then I see account unlock drawer with all elements in popup mode

  @LW-11023
  Scenario: Popup View - Accounts menu - Unlocking account error when wrong password
    Given I click the menu button
    And I click on chevron for wallet number 1
    And I click unlock button: 4
    When I fill invalid password on the account unlock drawer
    And I click "Confirm" button on the account unlock drawer
    Then I see wallet unlock error

  @LW-11022
  Scenario Outline: Popup View - Accounts menu - Closing unlock drawer when <action>
    Given I click the menu button
    And I click on chevron for wallet number 1
    And I see unlock button: 4
    And I click unlock button: 4
    When <action>
    Then I do not see account unlock drawer with all elements in popup mode
    And I see unlock button: 4
    Examples:
      | action                                             |
      | I close the drawer by clicking back button         |
      | I click "Cancel" button on the account unlock drawer |

  @LW-9332
  Scenario: Popup View - Accounts menu - Unlocking account
    Given I see address for account: 0 and wallet "MultiAccActive1" on empty state banner
    And I click the menu button
    And I click on chevron for wallet number 1
    When I click unlock button: 4
    And I fill valid password on the account unlock drawer
    And I click "Confirm" button on the account unlock drawer
    Then I see "Account #3 activated" toast
    And I wait for main loader to disappear
    And I do not see account unlock drawer with all elements in popup mode
    When I see address for account: 3 and wallet "MultiAccActive1" on empty state banner
    And I click the menu button
    And I click on chevron for wallet number 1
    Then I do not see unlock button: 4

  @LW-9333
  Scenario: Popup View - Accounts menu - Switching account
    Given I see address for account: 0 and wallet "MultiAccActive1" on empty state banner
    And I click the menu button
    And I click on chevron for wallet number 1
    When I click account item: 2
    Then I see "Account #1 activated" toast
    And I wait for main loader to disappear
    Then I see address for account: 1 and wallet "MultiAccActive1" on empty state banner

  @LW-11034
  Scenario: Popup View - Accounts menu - Trying to switch to the same account
    Given I see address for account: 0 and wallet "MultiAccActive1" on empty state banner
    And I click the menu button
    And I click on chevron for wallet number 1
    When I click account item: 1
    Then "Accounts" menu is displayed
    And I click on back arrow button on "Accounts" menu
    And I see address for account: 0 and wallet "MultiAccActive1" on empty state banner
