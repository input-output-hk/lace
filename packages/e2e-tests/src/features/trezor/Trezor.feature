@TrezorOnboarding @Trezor @Pending
Feature: Trezor Onboarding

  Scenario: Onboarding Trezor wallet
    And I connect, unlock and enter correct pin on Trezor emulator
    Given I click "Connect" button on wallet setup page
    # TODO: remove/replace outdated steps
#    And I click "OK" button on "Limited support for DApp" modal
#    And I am on "Lace terms of use" page and accept terms
#    And I am on "Help us improve your experience" page
    When I click "Agree" button on Analytics page
#    And I click Trezor wallet icon
    And I click "Next" button during wallet setup
    And I select 1 account on Select Account page
    When I click "Next" button during wallet setup
    When I enter wallet name with size of: 10 characters
    When I click "Next" button during wallet setup
    And I switch to window with title: TrezorConnect
    And I reject analytics and click "Allow once for this session" on Trezor Connect page
    And I click "Export" on Trezor Connect page
    And I confirm exporting public key on Trezor emulator
    And I switch to window with Lace
#    Then "All done" page is displayed
    When I click "Go to my wallet" button on "All done" page
    Then I see LW homepage
