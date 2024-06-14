@Runner4 @LockWallet-extended @Mainnet @Testnet @Pending
Feature: Wallet locking / unlocking - Extended view

  Background:
    Given Lace is ready for test

  @LW-2894 @Smoke @Pending
  Scenario: Extended view - Lock screen button opens lock screen
    And I lock my wallet
    Then I see locked wallet screen

  @LW-2895
  Scenario: Extended view - Unlock screen opened when going to popup view
    Given I am on lock screen
    When I navigate to home page on popup view
    Then I see unlock wallet screen

  @LW-3035
  Scenario: Extended view - "Help and support" button click
    Given I am on lock screen
    When I click "Help and support" button on unlock screen
    Then I see "Help and support" page

  @LW-3036 @Smoke
  Scenario: Extended view - Unlocking wallet with correct password opens wallet
    Given I am on unlock screen
    And "Unlock" button is disabled on unlock screen
    When I fill password input with correct password
    And "Unlock" button is enabled on unlock screen
    And I click "Unlock" button on unlock screen
    Then I see Lace extension main page in popup mode

  @LW-3037
  Scenario: Extended view - Unlocking wallet with incorrect password shows error
    Given I am on unlock screen
    When I fill password input with incorrect password
    And I click "Unlock" button on unlock screen
    Then I see "general.errors.invalidPassword" password error
