@Accounts-Extended @Testnet
Feature: Wallet accounts

  Background:
    Given Wallet is synced

  @LW-9298 @LW-9300 @LW-9301
  Scenario: Extended View - Accounts menu displayed
    When I click the menu button
    And I click on chevron for wallet number 1
    Then "Accounts" menu is displayed
    And I see 24 accounts on the list
    And each account item contains icon, logo and path

  @LW-9299
  Scenario: Extended View - Accounts menu - Click on back button
    When I click the menu button
    And I click on chevron for wallet number 1
    And I click on back arrow button on "Accounts" menu
    Then "Accounts" menu is not displayed
    And the user menu is displayed

  @LW-11021
  Scenario: Extended View - Accounts menu - Account unlock drawer displayed
    Given I click the menu button
    And I click on chevron for wallet number 1
    When I click unlock button: 4
    Then I see account unlock drawer with all elements in extended mode

  @LW-11020
  Scenario: Extended View - Accounts menu - Unlocking account error when wrong password
    Given I click the menu button
    And I click on chevron for wallet number 1
    And I click unlock button: 4
    When I fill invalid password on the account unlock drawer
    And I click "Confirm" button on the account unlock drawer
    Then I see wallet unlock error

  @LW-11019
  Scenario Outline: Extended View - Accounts menu - Closing unlock drawer when <action>
    Given I click the menu button
    And I click on chevron for wallet number 1
    And I see unlock button: 4
    And I click unlock button: 4
    When <action>
    Then I do not see account unlock drawer with all elements in extended mode
    And I see unlock button: 4
    Examples:
      | action                                             |
      | I click outside the drawer                         |
      | I close the drawer by clicking back button         |
      | I click "Cancel" button on the account unlock drawer |

  @LW-9312
  Scenario: Extended View - Accounts menu - Unlocking account
    Given I click "Receive" button on page header
    And I see "Wallet Address" page in extended mode for account: 0 and wallet "MultiAccActive1"
    And I close the drawer by clicking close button
    And I click the menu button
    And I click on chevron for wallet number 1
    When I click unlock button: 4
    And I fill valid password on the account unlock drawer
    And I click "Confirm" button on the account unlock drawer
    Then I see "Account #3 activated" toast
    And I wait for main loader to disappear
    And I do not see account unlock drawer with all elements in extended mode
    When I click "Receive" button on page header
    Then I see "Wallet Address" page in extended mode for account: 3 and wallet "MultiAccActive1"
    And I close the drawer by clicking close button
    When I click the menu button
    And I click on chevron for wallet number 1
    Then I do not see unlock button: 4
