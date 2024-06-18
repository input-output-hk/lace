@LockWallet-popup @Mainnet @Testnet @Pending
Feature: Wallet locking / unlocking - Popup view

  Background:
    Given Lace is ready for test

  @LW-3038
  Scenario: Popup view - Lock screen button opens lock screen
    And I lock my wallet
    Then I see unlock wallet screen

  @LW-3039
  Scenario: Popup view - Unlock screen opened when going to popup view
    And I am on lock screen
    When I navigate to home page on popup view
    Then I see unlock wallet screen

  @LW-3040
  Scenario: Popup view - Unlocking wallet with correct password opens wallet
    And I am on unlock screen
    And "Unlock" button is disabled on unlock screen
    When I fill password input with correct password
    And "Unlock" button is enabled on unlock screen
    And I click "Unlock" button on unlock screen
    Then I see Lace extension main page in popup mode

  @LW-3041
  Scenario: Popup view - Unlocking wallet with incorrect password shows error
    And I am on unlock screen
    When I fill password input with incorrect password
    And I click "Unlock" button on unlock screen
    Then I see "general.errors.invalidPassword" password error
