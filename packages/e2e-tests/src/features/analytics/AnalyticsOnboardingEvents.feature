@OnboardingCreateWallet @Analytics @Testnet
Feature: Analytics - Posthog - Onboarding - Extended View

  @LW-8311 @Pending
  @issue=@LW-10109
  Scenario Outline: Analytics - Posthog events are enabled or disabled based on decision <enable_analytics> on Analytics page
    Given I set up request interception for posthog analytics request(s)
    When I click "Create" button on wallet setup page
    # When I accept "T&C" checkbox
    And I click "Next" button during wallet setup
#    When "Help us improve your experience" page is displayed
    And I click "<enable_analytics>" button on Analytics page
    And I enter wallet name: "wallet"
    And I click "Next" button during wallet setup
    # When I enter password: "N_8J@bne87A" and password confirmation: "N_8J@bne87A"
    And I click "Next" button during wallet setup
#    When "Mnemonic info" page is displayed
    And I validate that <number_of_events> analytics event(s) have been sent

    Examples:
      | enable_analytics | number_of_events |
      | Agree            | 4                |
      | Skip             | 0                |

  @LW-7363 @Pending
  @issue=@LW-10109
  Scenario: Analytics - Restore wallet events / check that alias event is assigning same id in posthog
    Given I set up request interception for posthog analytics request(s)
    When I click "Restore" button on wallet setup page
    When I click "OK" button on "Restoring a multi-address wallet?" modal
    # When I accept "T&C" checkbox
    And I click "Next" button during wallet setup
#    When "Help us improve your experience" page is displayed
    And I click "Agree" button on Analytics page
    And I validate latest analytics multiple events:
      | wallet \| session start \| pageview                         |
      | onboarding \| restore wallet \| analytics \| agree \| click |
    When "Wallet setup" page is displayed
    And I enter wallet name: "wallet"
    And I click "Next" button during wallet setup
    Then I validate latest analytics single event "onboarding | restore wallet | wallet name | next | click"
    # When I enter password: "N_8J@bne87A" and password confirmation: "N_8J@bne87A"
    And I click "Next" button during wallet setup
    Then I validate latest analytics single event "onboarding | restore wallet | wallet password | next | click"
#    When "Recovery phrase length page" is displayed and 24 words checkbox is checked
    And I click "Next" button during wallet setup
    Then I validate latest analytics single event "onboarding | restore wallet | recovery phrase length | next | click"
    # When I pass "Mnemonic verification" page with words 8 of 24
    Then I validate latest analytics single event "onboarding | restore wallet | enter passphrase #01 | next | click"
    # When I pass "Mnemonic verification" page with words 16 of 24
    Then I validate latest analytics single event "onboarding | restore wallet | enter passphrase #09 | next | click"
    # When I pass "Mnemonic verification" page with words 24 of 24
    Then I validate latest analytics single event "onboarding | restore wallet | enter passphrase #17 | next | click"
    When I click "Go to my wallet" button on "All done" page
    And I validate latest analytics multiple events:
      | onboarding \| restore wallet \| all done \| go to my wallet \| click |
      | $create_alias                                                        |
    And I validate that alias event has assigned same user id "5b3ca1f1f7a14aad1e79f46213e2777d" in posthog
    And I validate that 10 analytics event(s) have been sent

  @LW-7365 @Pending
  @issue=@LW-10109
  Scenario: Analytics - Onboarding new wallet events
    Given I set up request interception for posthog analytics request(s)
    When I click "Create" button on wallet setup page
   #  When I accept "T&C" checkbox
    And I click "Next" button during wallet setup
#    When "Help us improve your experience" page is displayed
    And I click "Agree" button on Analytics page
    And I validate latest analytics multiple events:
      | wallet \| session start \| pageview                     |
      | onboarding \| new wallet \| analytics \| agree \| click |
    When "Wallet setup" page is displayed
    And I enter wallet name: "wallet"
    And I click "Next" button during wallet setup
    Then I validate latest analytics single event "onboarding | new wallet | wallet name | next | click"
    # When I enter password: "N_8J@bne87A" and password confirmation: "N_8J@bne87A"
    And I click "Next" button during wallet setup
    Then I validate latest analytics single event "onboarding | new wallet | wallet password | next | click"
#    When "Mnemonic info" page is displayed
    And I click "Next" button during wallet setup
    Then I validate latest analytics single event "onboarding | new wallet | passphrase intro | next | click"
    # When I pass "Mnemonic writedown" page with words 8 of 24
    Then I validate latest analytics single event "onboarding | new wallet | write passphrase #01 | next | click"
    # When I pass "Mnemonic writedown" page with words 16 of 24
    Then I validate latest analytics single event "onboarding | new wallet | write passphrase #09 | next | click"
    # When I pass "Mnemonic writedown" page with words 24 of 24
    Then I validate latest analytics single event "onboarding | new wallet | write passphrase #17 | next | click"
    # When I pass "Mnemonic verification" page with words 8 of 24
    Then I validate latest analytics single event "onboarding | new wallet | enter passphrase #01 | next | click"
    # When I pass "Mnemonic verification" page with words 16 of 24
    Then I validate latest analytics single event "onboarding | new wallet | enter passphrase #09 | next | click"
    # When I pass "Mnemonic verification" page with words 24 of 24
    Then I validate latest analytics single event "onboarding | new wallet | enter passphrase #17 | next | click"
    When I click "Go to my wallet" button on "All done" page
    And I see LW homepage
    And I validate latest analytics multiple events:
      | onboarding \| new wallet \| all done \| go to my wallet \| click |
      | $create_alias                                                    |
    And I validate that 13 analytics event(s) have been sent

  @LW-7364 @Pending
    # Disabled as user is opted out until he decision about tracking.
  Scenario: Analytics - Restore wallet events - cancel on "Restoring a multi-address wallet?" modal
    Given I set up request interception for posthog analytics request(s)
    When I click "Restore" button on wallet setup page
    Then I validate latest analytics single event "onboarding | restore wallet | restore | click"
    When I click "Cancel" button on "Restoring a multi-address wallet?" modal
    Then I validate latest analytics single event "onboarding | restore wallet | warning multi-address wallet | cancel | click"
    And I validate that 2 analytics event(s) have been sent
