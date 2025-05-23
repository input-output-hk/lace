@Top-Navigation-Popup @Analytics @Mainnet @Testnet
Feature: Analytics - Top Navigation - Popup view

  Background:
    Given Wallet is synced

  @LW-8754
  Scenario: Analytics - Popup view - Lace menu - User/wallet profile events
    Given I am on Tokens popup page
    And I set up request interception for posthog analytics request(s)
    When I click the menu button
    Then I validate latest analytics single event 'user/wallet profile | profile icon | click'
    When I click on the Address Book option
    Then I validate latest analytics single event 'user/wallet profile | address book | click'
    When I click the menu button
    Then I validate latest analytics single event 'user/wallet profile | profile icon | click'
    And I click on the settings option
    Then I validate latest analytics single event 'user/wallet profile | settings | click'
    When I click the menu button
    Then I validate latest analytics single event 'user/wallet profile | profile icon | click'
    And I set theme switcher to dark mode
    Then I validate latest analytics single event 'user/wallet profile | dark mode | click'
    When I set theme switcher to light mode
    Then I validate latest analytics single event 'user/wallet profile | light mode | click'
    When I click on the network option
    And I click on then network sub-menu back button
    Then I validate latest analytics single event 'user/wallet profile | network | click'
    When I click on 'Add new wallet' option
    Then I validate latest analytics single event 'user/wallet profile | add new wallet | click'
    And I validate that 9 analytics event(s) have been sent

  # TODO: enable when 'lock wallet' feature is fixed
  @LW-8755 @Pending
  Scenario: Analytics - Popup view - Lace menu - User/wallet profile events - Lock wallet
    Given I click the menu button
    When I set up request interception for posthog analytics request(s)
    And I click on the Lock Wallet option
    Then I validate latest analytics single event 'user/wallet profile | lock wallet | click'
    And I validate that 1 analytics event(s) have been sent
