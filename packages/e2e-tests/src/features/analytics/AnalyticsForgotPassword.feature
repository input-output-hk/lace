@ForgotPassword @Analytics @Mainnet @Testnet
Feature: Analytics - Forgot Password

  Background:
    Given Wallet is synced

  @LW-8763
  Scenario: Analytics - unlock event
    Given I am on unlock screen
    And I set up request interception for posthog analytics request(s)
    And "Unlock" button is disabled on unlock screen
    When I fill password input with correct password
    And "Unlock" button is enabled on unlock screen
    And I click "Unlock" button on unlock screen
    Then I see Lace extension main page in popup mode
    Then I validate latest analytics single event "unlock wallet | welcome back! | unlock | click"
    And I validate that 1 analytics event(s) have been sent

  @LW-8764
  Scenario: Analytics - "Forgot password?" - cancel event
    Given I am on lock screen
    And I navigate to home page on popup view
    And I see unlock wallet screen
    And I set up request interception for posthog analytics request(s)
    When I click on "Forgot password?" button on unlock screen
    Then I validate latest analytics single event "unlock wallet | welcome back! | forgot password? | click"
    And I click on "Cancel" button on "Forgot password?" modal
    Then I validate latest analytics single event "unlock wallet | forgot password? | cancel | click"
    And I validate that 2 analytics event(s) have been sent

    # this test should be executed as the last one in this suite
    # opening onboarding page & closing other tabs breaks webdriver session
  @LW-8762
  Scenario: Analytics - "Forgot password?" - happy path
    Given I am on lock screen
    And I navigate to home page on popup view
    And I see unlock wallet screen
    And I set up request interception for posthog analytics request(s)
    When I click on "Forgot password?" button on unlock screen
    Then I validate latest analytics single event "unlock wallet | welcome back! | forgot password? | click"
    And I click on "Proceed" button on "Forgot password?" modal
    Then I validate latest analytics single event "unlock wallet | forgot password? | proceed | click"
    Then I validate that 2 analytics event(s) have been sent
    And I switch to tab with restore wallet process
    And I close all remaining tabs except current one
    And I set up request interception for posthog analytics request(s)
    Then "Wallet setup" page is displayed
    When I enter password: "N_8J@bne87A" and password confirmation: "N_8J@bne87A"
    And I click "Next" button during wallet setup
    Then I validate latest analytics single event "unlock wallet | forgot password? | set up your password | next | click"
    And I click "Next" button during wallet setup
    Then I validate latest analytics single event "unlock wallet | forgot password? | recovery phrase length | next | click"
    And I am on "Mnemonic verification" last page from "Forgot password" and filled all words
    And I validate latest analytics multiple events:
      | unlock wallet \| forgot password? \| enter passphrase #01 \| next \| click |
      | unlock wallet \| forgot password? \| enter passphrase #09 \| next \| click |
    And I click "Next" button during wallet setup
    And I validate latest analytics single event "unlock wallet | forgot password? | enter passphrase #17 | next | click"
    Then I see LW homepage
    Then I validate that 5 analytics event(s) have been sent
