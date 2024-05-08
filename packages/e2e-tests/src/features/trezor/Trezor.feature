@TrezorOnboarding @Trezor @Pending
Feature: Trezor Onboarding

  Scenario: Onboarding Trezor wallet
    And I connect, unlock and enter correct pin on Trezor emulator
    Given I reject analytics banner on "Get started" page
    And I click "Connect" button on wallet setup page
    # TODO: remove/replace outdated steps
#    And I click Trezor wallet icon
    And I click "Next" button during wallet setup
#    And I select 1 account on Select Account page
    When I click "Next" button during wallet setup
    When I enter wallet name with size of: 10 characters
    When I click "Next" button during wallet setup
    And I switch to window with title: TrezorConnect
    And I reject analytics and click "Allow once for this session" on Trezor Connect page
    And I click "Export" on Trezor Connect page
    And I confirm exporting public key on Trezor emulator
    And I switch to window with Lace
    Then I see LW homepage
