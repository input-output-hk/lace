@Settings-Extended @Analytics
Feature: Analytics - Settings - Extended View

  Background:
    Given Lace is ready for test

  @LW-8548
  Scenario: Analytics - Extended view - Settings - Network events - Switch network
    Given I open settings from header menu
    And I set up request interception for posthog analytics request(s)
    And I click on "Network" setting
    Then I validate latest analytics single event "settings | network | click"
    When I click on "Preview" radio button
    Then I validate latest analytics single event "settings | network | preview | click"
    And I validate that 2 analytics event(s) have been sent

  @LW-8549
  Scenario: Analytics - Extended view - Settings - Network events - Close modal
    Given I open settings from header menu
    And I set up request interception for posthog analytics request(s)
    And I click on "Network" setting
    Then I validate latest analytics single event "settings | network | click"
    When I close the drawer by clicking close button
    Then I validate latest analytics single event "settings | network | x | click"
    And I validate that 2 analytics event(s) have been sent

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
    When I open settings from header menu
    And I set up request interception for posthog analytics request(s)
    And I click on "Your keys" setting
    Then I validate latest analytics single event "settings | your keys | click"
    When I click on Show public key button
    Then I validate latest analytics single event "settings | your keys | show public key | click"
    When I click "Copy" button on "Show public key" page
    Then I validate latest analytics single event "settings | your keys | show public key | copy | click"
    When I close the drawer by clicking close button
    Then I validate latest analytics single event "settings | your keys | show public key | x | click"
    And I validate that 4 analytics event(s) have been sent

  @LW-8553
  Scenario: Analytics - Extended View - Settings - Help events
    When I open settings from header menu
    And I set up request interception for posthog analytics request(s)
    And I click on "Help" setting
    Then I validate latest analytics single event "settings | help | click"
    When I click "Create a support ticket" button on Help drawer
    Then I validate latest analytics single event "settings | help | create a support ticket | click"
    And I validate that 2 analytics event(s) have been sent

  @LW-8554
  Scenario: Analytics - Extended View - Settings - Help events - Close modal
    When I open settings from header menu
    And I set up request interception for posthog analytics request(s)
    And I click on "Help" setting
    Then I validate latest analytics single event "settings | help | click"
    When I close the drawer by clicking close button
    Then I validate latest analytics single event "settings | help | x | click"
    And I validate that 2 analytics event(s) have been sent

  @LW-8555
  Scenario: Analytics - Extended View - Settings - Terms and Conditions events
    When I open settings from header menu
    And I set up request interception for posthog analytics request(s)
    And I click on "Terms and conditions" setting
    Then I validate latest analytics single event "settings | terms and conditions | click"
    When I close the drawer by clicking close button
    Then I validate latest analytics single event "settings | terms and conditions | x | click"
    And I validate that 2 analytics event(s) have been sent

  @LW-8556
  Scenario: Analytics - Extended View - Settings - Privacy policy events
    When I open settings from header menu
    And I set up request interception for posthog analytics request(s)
    And I click on "Privacy policy" setting
    Then I validate latest analytics single event "settings | privacy policy | click"
    When I close the drawer by clicking close button
    Then I validate latest analytics single event "settings | privacy policy | x | click"
    And I validate that 2 analytics event(s) have been sent

  @LW-8557
  Scenario: Analytics - Extended View - Settings - Cookie policy events
    When I open settings from header menu
    And I set up request interception for posthog analytics request(s)
    And I click on "Cookie policy" setting
    Then I validate latest analytics single event "settings | cookie policy | click"
    When I close the drawer by clicking close button
    Then I validate latest analytics single event "settings | cookie policy | x | click"
    And I validate that 2 analytics event(s) have been sent

  @LW-8558
  Scenario: Analytics - Extended View - Settings - Wallet removal events - Cancel
    When I open settings from header menu
    And I set up request interception for posthog analytics request(s)
    And I click on Remove wallet button
    Then I validate latest analytics single event "settings | remove wallet | click"
    When I click "Back" button on "Remove wallet" modal
    Then I validate latest analytics single event "settings | hold up | back | click"
    And I validate that 2 analytics event(s) have been sent

  @LW-8559
  Scenario: Analytics - Extended View - Settings - Wallet removal events - Remove wallet
    When I open settings from header menu
    And I set up request interception for posthog analytics request(s)
    And I click on Remove wallet button
    Then I validate latest analytics single event "settings | remove wallet | click"
    And I click "Remove wallet" button on "Remove wallet" modal
    Then I validate latest analytics single event "settings | hold up | remove wallet | click"
    And I validate that 2 analytics event(s) have been sent

  @LW-8787
  Scenario: Analytics - Extended View - Settings - Recovery phrase
    When I open settings from header menu
    And I set up request interception for posthog analytics request(s)
    And I click on "Show recovery phrase" setting
    Then I validate latest analytics single event "settings | show recovery phrase | click"
    When I fill correct password
    When I click on "Show passphrase" button
    Then I validate latest analytics single event "settings | show recovery phrase | enter your password | show recovery phrase | click"
    When I click on "Hide passphrase" button
    Then I validate latest analytics single event "settings | show recovery phrase | Your recovery phrase (keep it secret!) | hide passphrase | click"
    When I close the drawer by clicking close button
    Then I validate latest analytics single event "settings | show recovery phrase | Your recovery phrase (keep it secret!) | x | click"
    Then I validate that 4 analytics event(s) have been sent

  @LW-8788
  Scenario: Analytics - Extended View - Settings - FAQ
    When I open settings from header menu
    And I set up request interception for posthog analytics request(s)
    And I click on "FAQs" setting
    Then I validate latest analytics single event "settings | faqs | click"
    Then I validate that 1 analytics event(s) have been sent

  @LW-8789
  Scenario: Analytics - Extended View - Settings - Analytics
    When I open settings from header menu
    And I set up request interception for posthog analytics request(s)
    And Analytics toggle is enabled: true
    And Analytics toggle is enabled: false
    Then I validate latest analytics single event "settings | analytics | skip | click"
    Then I validate that 1 analytics event(s) have been sent

  @LW-8790
  Scenario: Analytics - Extended View - Settings - Theme switch
    When I open settings from header menu
    And I set up request interception for posthog analytics request(s)
    And I set theme switch in settings to dark mode
    Then I validate latest analytics single event "settings | theme | dark mode | click"
    And I set theme switch in settings to light mode
    Then I validate latest analytics single event "settings | theme | light mode | click"
    Then I validate that 2 analytics event(s) have been sent
    
