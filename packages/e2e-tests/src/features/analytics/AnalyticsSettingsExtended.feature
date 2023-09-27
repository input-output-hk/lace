@Settings-Extended @Analytics
Feature: Analytics - Settings - Extended View

  Background:
    Given Lace is ready for test

  @LW-8548
  Scenario: Analytics - Extended view - Settings - Network events - Switch network
    Given I set up request interception for posthog analytics request(s)
    When I open settings from header menu
    And I click on "Network" setting
    Then I validate latest analytics single event "settings | network | click"
    When I click on "Preview" radio button
    Then I validate latest analytics single event "settings | network | preview | click"

  @LW-8549
  Scenario: Analytics - Extended view - Settings - Network events - Close modal
    Given I set up request interception for posthog analytics request(s)
    When I open settings from header menu
    And I click on "Network" setting
    Then I validate latest analytics single event "settings | network | click"
    When I close the drawer by clicking close button
    Then I validate latest analytics single event "settings | network | x | click"

  @LW-8550
  Scenario: Analytics - Extended view - Settings - Authorized dapps events - Cancel dapp disconnection
    Given I open and authorize test DApp with "Always" setting
    And I switch to window with Lace
    And I close all remaining tabs except current one
    And I set up request interception for posthog analytics request(s)
    When I open settings from header menu
    And I click on "Authorized DApps" setting
    Then I validate latest analytics single event "settings | authorized dapps | click"
    When I de-authorize test DApp in extended mode
    Then I validate latest analytics single event "settings | authorized dapps | trash bin icon | click"
    When I click "Back" button in DApp removal confirmation modal
    Then I validate latest analytics single event "settings | authorized dapps | hold up! | back | click"

  @LW-8551
  Scenario: Analytics - Extended view - Settings - Authorized dapps events - Disconnect Dapp
    Given I open and authorize test DApp with "Always" setting
    And I switch to window with Lace
    And I close all remaining tabs except current one
    And I set up request interception for posthog analytics request(s)
    When I open settings from header menu
    And I click on "Authorized DApps" setting
    Then I validate latest analytics single event "settings | authorized dapps | click"
    When I de-authorize test DApp in extended mode
    Then I validate latest analytics single event "settings | authorized dapps | trash bin icon | click"
    When I click "Disconnect DApp" button in DApp removal confirmation modal
    Then I validate latest analytics single event "settings | authorized dapps | hold up! | disconnect dapp | click"

  @LW-8552
  Scenario: Analytics - Extended view - Settings - Your keys events
    Given I set up request interception for posthog analytics request(s)
    When I open settings from header menu
    And I click on "Your keys" setting
    Then I validate latest analytics single event "settings | your keys | click"
    When I click on Show public key button
    Then I validate latest analytics single event "settings | your keys | show public key | click"
    When I click "Copy" button on "Show public key" page
    Then I validate latest analytics single event "settings | your keys | show public key | copy | click"
    When I close the drawer by clicking close button
    Then I validate latest analytics single event "settings | your keys | show public key | x | click"

  @LW-8553
  Scenario: Analytics - Extended View - Settings - Help events
    Given I set up request interception for posthog analytics request(s)
    When I open settings from header menu
    And I click on "Help" setting
    Then I validate latest analytics single event "settings | help | click"
    When I click "Create a support ticket" button on Help drawer
    Then I validate latest analytics single event "settings | help | create a support ticket | click"

  @LW-8554
  Scenario: Analytics - Extended View - Settings - Help events - Close modal
    Given I set up request interception for posthog analytics request(s)
    When I open settings from header menu
    And I click on "Help" setting
    Then I validate latest analytics single event "settings | help | click"
    When I close the drawer by clicking close button
    Then I validate latest analytics single event "settings | help | x | click"

  @LW-8555
  Scenario: Analytics - Extended View - Settings - Terms and Conditions events
    Given I set up request interception for posthog analytics request(s)
    When I open settings from header menu
    And I click on "Terms and conditions" setting
    Then I validate latest analytics single event "settings | terms and conditions | click"
    When I close the drawer by clicking close button
    Then I validate latest analytics single event "settings | terms and conditions | x | click"

  @LW-8556
  Scenario: Analytics - Extended View - Settings - Privacy policy events
    Given I set up request interception for posthog analytics request(s)
    When I open settings from header menu
    And I click on "Privacy policy" setting
    Then I validate latest analytics single event "settings | privacy policy | click"
    When I close the drawer by clicking close button
    Then I validate latest analytics single event "settings | privacy policy | x | click"

  @LW-8557
  Scenario: Analytics - Extended View - Settings - Cookie policy events
    Given I set up request interception for posthog analytics request(s)
    When I open settings from header menu
    And I click on "Cookie policy" setting
    Then I validate latest analytics single event "settings | cookie policy | click"
    When I close the drawer by clicking close button
    Then I validate latest analytics single event "settings | cookie policy | x | click"

  @LW-8558
  Scenario: Analytics - Extended View - Settings - Wallet removal events - Cancel
    Given I set up request interception for posthog analytics request(s)
    When I open settings from header menu
    And I click on Remove wallet button
    Then I validate latest analytics single event "settings | remove wallet | click"
    When I click "Back" button on "Remove wallet" modal
    Then I validate latest analytics single event "settings | hold up | back | click"

  @LW-8559
  Scenario: Analytics - Extended View - Settings - Wallet removal events - Remove wallet
    Given I set up request interception for posthog analytics request(s)
    When I open settings from header menu
    And I click on Remove wallet button
    Then I validate latest analytics single event "settings | remove wallet | click"
    And I click "Remove wallet" button on "Remove wallet" modal
    Then I validate latest analytics single event "settings | hold up | remove wallet | click"
