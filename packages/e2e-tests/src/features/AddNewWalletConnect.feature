@AddNewWalletConnect @Testnet @Mainnet
@SkipFirefox
Feature: Add new wallet - Connect hardware wallet

  @LW-9358
  Scenario: Extended-view - Multi-wallet - Connect - Create button click
    When I opened "Connect" flow via "Add new wallet" feature
    Then "Connect your device" page is displayed in modal
    And "Connect device" step is marked as active on progress timeline

  @LW-9359
  Scenario: Extended-view - Multi-wallet - Connect - Back button click
    Given I opened "Connect" flow via "Add new wallet" feature
    And "Connect your device" page is displayed in modal
    When I click "Back" button during wallet setup
    Then I see onboarding main screen within modal over the active Lace page in expanded view

  @LW-10965
  Scenario: Extended-view - Multi-wallet - Connect - "No hardware wallet device was chosen." error
    When I opened "Connect" flow via "Add new wallet" feature
    # Step below triggers error by closing HID window
    And I switch to window with Lace
    Then "No hardware wallet device was chosen." error is displayed on "Connect your device" page
    And "Try again" button is enabled on "Connect your device" page
