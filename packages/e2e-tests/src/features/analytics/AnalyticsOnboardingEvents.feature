@OnboardingCreateWallet @Testnet @Mainnet
Feature: Analytics - Posthog - Onboarding - Extended View

  @LW-7365
  Scenario: Onboarding new wallet events
    Given I set up request interception for posthog analytics request(s)
    When I click "Create" button on wallet setup page
    Then I validate latest analytics request event(s):
      | onboarding \| new wallet \| create \| click |
    When I accept "T&C" checkbox
    And I click "Next" button during wallet setup
    Then I validate latest analytics request event(s):
      | onboarding \| new wallet \| lace terms of use \| next \| click |
    When "Help us improve your experience" page is displayed
    And I click "Skip" button on Analytics page
    Then I validate latest analytics request event(s):
      | onboarding \| new wallet \| analytics \| skip \| click |
    When "Name your wallet" page is displayed
    And I enter wallet name: "wallet"
    And I click "Next" button during wallet setup
    Then I validate latest analytics request event(s):
      | onboarding \| new wallet \| wallet name \| next \| click |
    When I enter password: "N_8J@bne87A" and password confirmation: "N_8J@bne87A"
    And I click "Next" button during wallet setup
    Then I validate latest analytics request event(s):
      | onboarding \| new wallet \| wallet password \| next \| click |
    When "Mnemonic info" page is displayed
    And I click "Next" button during wallet setup
    Then I validate latest analytics request event(s):
      | onboarding \| new wallet \| passphrase intro \| next \| click |
    When I pass "Mnemonic writedown" page with words 8 of 24
    Then I validate latest analytics request event(s):
      | onboarding \| new wallet \| write passphrase #01 \| next \| click |
    When I pass "Mnemonic writedown" page with words 16 of 24
    Then I validate latest analytics request event(s):
      | onboarding \| new wallet \| write passphrase #09 \| next \| click |
    When I pass "Mnemonic writedown" page with words 24 of 24
    Then I validate latest analytics request event(s):
      | onboarding \| new wallet \| write passphrase #17 \| next \| click |
    When I pass "Mnemonic verification" page with words 8 of 24
    Then I validate latest analytics request event(s):
      | onboarding \| new wallet \| enter passphrase #01 \| next \| click |
    When I pass "Mnemonic verification" page with words 16 of 24
    Then I validate latest analytics request event(s):
      | onboarding \| new wallet \| enter passphrase #09 \| next \| click |
    When I pass "Mnemonic verification" page with words 24 of 24
    Then I validate latest analytics request event(s):
      | onboarding \| new wallet \| enter passphrase #17 \| next \| click |
    When I click "Go to my wallet" button on "All done" page
    Then I validate latest analytics request event(s):
      | onboarding \| new wallet \| all done \| go to my wallet \| click |
    And I validate that 13 analytics event(s) have been sent

  @LW-7363
  Scenario: Restore wallet events
    Given I set up request interception for posthog analytics request(s)
    When I click "Restore" button on wallet setup page
    Then I validate latest analytics request event(s):
      | onboarding \| restore wallet \| restore \| click |
    When I click "OK" button on "Restoring a multi-address wallet?" modal
    Then I validate latest analytics request event(s):
      | onboarding \| restore wallet \| warning multi-address wallet \| ok \| click |
    When I accept "T&C" checkbox
    And I click "Next" button during wallet setup
    Then I validate latest analytics request event(s):
      | onboarding \| restore wallet \| lace terms of use \| next \| click |
    When "Help us improve your experience" page is displayed
    And I click "Agree" button on Analytics page
    Then I validate latest analytics request event(s):
      | onboarding \| restore wallet \| analytics \| agree \| click |
    When "Name your wallet" page is displayed
    And I enter wallet name: "wallet"
    And I click "Next" button during wallet setup
    Then I validate latest analytics request event(s):
      | onboarding \| restore wallet \| wallet name \| next \| click |
    When I enter password: "N_8J@bne87A" and password confirmation: "N_8J@bne87A"
    And I click "Next" button during wallet setup
    Then I validate latest analytics request event(s):
      | onboarding \| restore wallet \| wallet password \| next \| click |
    When "Recovery phrase length page" is displayed and 24 words checkbox is checked
    And I click "Next" button during wallet setup
    Then I validate latest analytics request event(s):
      | onboarding \| restore wallet \| recovery phrase length \| next \| click |
    When I pass "Mnemonic verification" page with words 8 of 24
    Then I validate latest analytics request event(s):
      | onboarding \| restore wallet \| enter passphrase #01 \| next \| click |
    When I pass "Mnemonic verification" page with words 16 of 24
    Then I validate latest analytics request event(s):
      | onboarding \| restore wallet \| enter passphrase #09 \| next \| click |
    When I pass "Mnemonic verification" page with words 24 of 24
    Then I validate latest analytics request event(s):
      | onboarding \| restore wallet \| enter passphrase #17 \| next \| click |
    When I click "Go to my wallet" button on "All done" page
    Then I validate latest analytics request event(s):
      | onboarding \| restore wallet \| all done \| go to my wallet \| click |
    And I validate that 11 analytics event(s) have been sent

  @LW-7364
  Scenario: Restore wallet events - cancel on "Restoring a multi-address wallet?" modal
    Given I set up request interception for posthog analytics request(s)
    When I click "Restore" button on wallet setup page
    Then I validate latest analytics request event(s):
      | onboarding \| restore wallet \| restore \| click |
    When I click "Cancel" button on "Restoring a multi-address wallet?" modal
    Then I validate latest analytics request event(s):
      | onboarding \| restore wallet \| warning multi-address wallet \| cancel \| click |
    And I validate that 2 analytics event(s) have been sent
