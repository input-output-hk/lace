@OnboardingRestoreWallet @Onboarding @Testnet @Mainnet
Feature: Onboarding - Restore wallet

  @LW-2457
  Scenario: Restore Wallet - Mnemonic writedown page - next button
    Given I click "Restore" button on wallet setup page
    And I click "Next" button during wallet setup
    Then "Mnemonic verification" page is displayed from "Restore wallet" flow with 24 words
    And "Next" button is disabled during onboarding process

  @LW-2459
  Scenario: Restore Wallet - happy path to "Name your wallet" page
    Given I click "Restore" button on wallet setup page
    And I go to "Wallet setup" page from "Restore" wallet flow
    And "Wallet setup" page is displayed

  @LW-2460
  Scenario: Restore Wallet - Mnemonic verification - fill all fields - wrong mnemonic
    Given I click "Restore" button on wallet setup page
    And I go to "Mnemonic verification" page from "Restore" wallet flow and fill values
    When I add characters "asd" in word 7
    Then "Next" button is disabled during onboarding process

  @LW-2461
  Scenario: Restore Wallet - Name your wallet - back button
    Given I click "Restore" button on wallet setup page
    And I go to "Wallet setup" page from "Restore" wallet flow
    And "Wallet setup" page is displayed
    When I click "Back" button during wallet setup
    Then "Mnemonic verification" page is displayed from "Restore wallet" flow with 24 words

  @LW-2462 @Smoke
  Scenario: Restore Wallet - Name your wallet - happy path to "Enter wallet step"
    Given I click "Restore" button on wallet setup page
    And I click "Next" button during wallet setup
    And I enter 24 correct mnemonic words on "Mnemonic verification" page
    And I click "Next" button during wallet setup
    And I enter wallet name: "ValidName", password: "N_8J@bne87A" and password confirmation: "N_8J@bne87A"
    Then "Enter wallet" button is enabled

  @LW-2977
  Scenario Outline: Restore Wallet - Set password - Recommendation for password: <passw_err>, password: <password>, password confirmation: <password_conf>
    Given I click "Restore" button on wallet setup page
    And I go to "Wallet setup" page from "Restore" wallet flow and not fill values
    When I enter wallet name: "wallet", password: "<password>" and password confirmation: "<password_conf>"
    Then Password recommendation: "<passw_err>", complexity bar level: "<complex_bar_lvl>" and password confirmation error: "<passw_conf_err>" are displayed
    Examples:
      | password    | password_conf | passw_err                                                               | complex_bar_lvl | passw_conf_err                               |
      | a           |               | core.walletNameAndPasswordSetupStep.firstLevelPasswordStrengthFeedback  | 1               | empty                                        |
      | P@ss        |               | core.walletNameAndPasswordSetupStep.firstLevelPasswordStrengthFeedback  | 1               | empty                                        |
      | N_8J@bne    |               | core.walletNameAndPasswordSetupStep.secondLevelPasswordStrengthFeedback | 2               | empty                                        |
      | N_8J@bne87  |               | empty                                                                   | 3               | empty                                        |
      | N_8J@bne87A | N_8J@bne87    | empty                                                                   | 4               | core.walletSetupRegisterStep.noMatchPassword |

  @LW-2464 @LW-10208 @memory-snapshot
  Scenario: Restore Wallet - All done page - happy path
    Given I click "Restore" button on wallet setup page
    And I go to "Wallet setup" page from "Restore" wallet flow and fill values
    When I click "Enter wallet" button
    Then I see LW homepage
    And "Pin the wallet extension" notification is displayed
    And "Pin the wallet extension" notification disappears after 5 seconds
    And valid password is not in snapshot

  @LW-3063
  Scenario: Extended view - Settings - Analytics enabled/disabled when restoring a wallet
    Given I click "Restore" button on wallet setup page
    And I go to "Wallet setup" page from "Restore" wallet flow and fill values
    When I click "Enter wallet" button
    Then I see LW homepage
    When I confirm multi-address discovery modal
    And I open settings from header menu
    Then Analytics toggle is enabled
    When I open settings from header menu
    And I click on Remove wallet button
    And I click "Remove wallet" button on "Remove wallet" modal
    And I reject analytics banner on "Get started" page
    Given I click "Restore" button on wallet setup page
    And I go to "Wallet setup" page from "Restore" wallet flow and fill values
    When I click "Enter wallet" button
    Then I see LW homepage
    When I confirm multi-address discovery modal
    And I open settings from header menu
    Then Analytics toggle is not enabled

  @LW-2628
  Scenario: Restore Wallet - autofill words
    Given I click "Restore" button on wallet setup page
    And I click "Next" button during wallet setup
    Then "Mnemonic verification" page is displayed from "Restore wallet" flow with 24 words
    When I fill mnemonic input with "s"
    Then I see following autocomplete options:
      | sad     |
      | saddle  |
      | sadness |
    And I click header to lose focus
    Then I do not see autocomplete options list
    And I click on mnemonic input
    Then I see following autocomplete options:
      | sad     |
      | saddle  |
      | sadness |
    When I fill mnemonic input with "se"
    Then I see following autocomplete options:
      | sea    |
      | search |
      | season |
    When I fill mnemonic input with "sef"
    Then I do not see autocomplete options list
    When I fill mnemonic input with "SE"
    Then I see following autocomplete options:
      | sea    |
      | search |
      | season |
    When I fill mnemonic input with "ą"
    Then I do not see autocomplete options list

  @LW-4612
  Scenario: Restore Wallet - Mnemonic verification - mnemonic length limited to 10 characters - paste word exceeding the limit
    Given I click "Restore" button on wallet setup page
    And I click "Next" button during wallet setup
    And "Mnemonic verification" page is displayed from "Restore wallet" flow with 24 words
    When I fill mnemonic input with "abcdefghijklmnopqrstuvwxyz"
    Then the mnemonic input contains the word "abcdefghij"
    And the word in mnemonic input has only 10 characters
