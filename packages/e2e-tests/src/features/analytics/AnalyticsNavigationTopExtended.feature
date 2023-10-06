@Top-Navigation-Extended @Analytics @Mainnet @Testnet
Feature: Analytics - Top Navigation - Extended view

  Background:
    Given Wallet is synced

  @LW-8752
  Scenario: Analytics - Extended view - Lace menu - User/wallet profile events
    Given I set up request interception for posthog analytics request(s)
    And I am on Tokens extended page
    When I click the menu button
    Then I validate latest analytics single event "user/wallet profile | profile icon | click"
    When I click on the user details button
    Then I validate latest analytics single event "user/wallet profile | wallet address | click"
    When I click on the Address Book option
    Then I validate latest analytics single event "user/wallet profile | address book | click"
    When I click on the settings option
    Then I validate latest analytics single event "user/wallet profile | settings | click"
    When I click the menu button
    And I set theme switcher to dark mode
    Then I validate latest analytics single event "user/wallet profile | dark mode | click"
    When I set theme switcher to light mode
    Then I validate latest analytics single event "user/wallet profile | light mode | click"
    When I click on the network option
    Then I validate latest analytics single event "user/wallet profile | network | click"

  @LW-8753
  Scenario: Analytics - Extended view - Lace menu - User/wallet profile events - Lock wallet
    Given I set up request interception for posthog analytics request(s)
    When I click the menu button
    And I click on the Lock Wallet option
    Then I validate latest analytics single event "user/wallet profile | lock wallet | click"
