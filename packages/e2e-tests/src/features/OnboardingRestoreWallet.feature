@OnboardingRestoreWallet @Onboarding @Testnet @Mainnet
Feature: Onboarding - Restore wallet

  @LW-2448 @Pending @Obsolete @LW-9804
  Scenario: Restore wallet - "Restoring a multi-address wallet?" popup displayed
    Given I click "Restore" button on wallet setup page
    Then "Restoring a multi-address wallet?" modal is displayed

  @LW-2449 @Pending @Obsolete @LW-9804
  Scenario: Restore wallet - "Restoring a multi-address wallet?" popup - cancel button click
    Given I click "Restore" button on wallet setup page
    When I click "Cancel" button on "Restoring a multi-address wallet?" modal
    Then "Get started" page is displayed

  @LW-2450 @Pending @Obsolete
  Scenario: Restore wallet - Legal page displayed
    Given I click "Restore" button and confirm
#    Then "Legal page" is displayed

  @LW-2451 @Pending @Obsolete
  Scenario: Restore wallet - Legal page - next button disabled
    Given I click "Restore" button and confirm
    Then "Next" button is disabled during onboarding process

  @LW-2452 @Pending @Obsolete
  Scenario: Restore wallet - Legal page - accept T&C - next button enabled
    Given I click "Restore" button and confirm
    When I accept "T&C" checkbox
    Then "Next" button is enabled during onboarding process

  @LW-2453 @Pending @Obsolete
  Scenario: Restore wallet - Legal page - accept T&C - back button
    Given I click "Restore" button and confirm
    When I click "Back" button during wallet setup
    Then "Get started" page is displayed

  @LW-2454 @Pending @Obsolete
  Scenario: Restore wallet - Help us improve your experience page displayed
    Given I click "Restore" button and confirm
#    And I am on "Legal page"
    When I click "Next" button during wallet setup
#    Then "Help us improve your experience" page is displayed

  @LW-4663 @Pending @Obsolete
  Scenario: Restore wallet - Help us improve your experience - Privacy Policy link
    Given I click "Restore" button and confirm
    And I am on "Lace terms of use" page and accept terms
#    And I am on "Help us improve your experience" page
    When I click on Privacy Policy link
#    Then Privacy Policy is displayed in new tab

  @LW-2455 @Pending @Obsolete
  Scenario Outline: Restore wallet - Help us improve your experience page - <button> button click
    Given I click "Restore" button and confirm
    And I am on "Lace terms of use" page and accept terms
#    And I am on "Help us improve your experience" page
    When I click "<button>" button on Analytics page
    Then "Wallet setup" page is displayed

    Examples:
      | button |
      | Skip   |
      | Agree  |

  @LW-2456 @Pending @Obsolete
  Scenario: Restore wallet - Help us improve your experience page - Back button click
    Given I click "Restore" button and confirm
    And I am on "Lace terms of use" page and accept terms
#    And I am on "Help us improve your experience" page
    When I click "Back" button on Analytics page
#    Then "Legal page" is displayed

  @LW-2457
  Scenario: Restore Wallet - Mnemonic writedown page - next button
    Given I click "Restore" button and confirm
    And "Wallet setup" page is displayed
    And I enter wallet name: "ValidName", password: "N_8J@bne87A" and password confirmation: "N_8J@bne87A"
    And I click "Next" button during wallet setup
    Then "Mnemonic verification" page is displayed from "Restore wallet" flow with 24 words
    And "Next" button is disabled during onboarding process

  @LW-2459
  Scenario: Restore Wallet - happy path to "Name your wallet" page
    Given I click "Restore" button and confirm
    And "Wallet setup" page is displayed

  @LW-2460
  Scenario: Restore Wallet - Mnemonic verification - fill all fields - wrong mnemonic
    Given I click "Restore" button and confirm
    And I go to "Mnemonic verification" page from "Restore" wallet flow
    When I add characters "asd" in word 7
    Then "Next" button is disabled during onboarding process

  @LW-2461
  Scenario: Restore Wallet - Name your wallet - back button
    Given I click "Restore" button and confirm
    And "Wallet setup" page is displayed
    When I click "Back" button during wallet setup
    When "Get started" page is displayed

  @LW-2462 @Smoke
  Scenario: Restore Wallet - Name your wallet - happy path to "Enter wallet step"
    Given I click "Restore" button and confirm
    And I enter wallet name: "ValidName", password: "N_8J@bne87A" and password confirmation: "N_8J@bne87A"
    And I click "Next" button during wallet setup
    And I enter 24 correct mnemonic words on "Mnemonic verification" page
    Then "Enter wallet" button is enabled

  @LW-2463 @Pending @Obsolete
  Scenario: Restore Wallet  - Name your wallet - next button disabled for empty wallet name
    Given I click "Restore" button and confirm
    And I am on "Lace terms of use" page and accept terms
#    And I am on "Help us improve your experience" page
    When I click "Agree" button on Analytics page
    And "Wallet setup" page is displayed
    When I enter wallet name: "empty"
    Then "Next" button is disabled during onboarding process

  @LW-2977
  Scenario Outline: Restore Wallet - Set password - Recommendation for password: <passw_err>, password: <password>, password confirmation: <password_conf>
    Given I click "Restore" button and confirm
    And I go to "Wallet setup" page from "Restore" wallet flow and "not fill" values
    When I enter wallet name: "wallet", password: "<password>" and password confirmation: "<password_conf>"
    Then Password recommendation: "<passw_err>", complexity bar level: "<complex_bar_lvl>" and password confirmation error: "<passw_conf_err>" are displayed
    Examples:
      | password    | password_conf | passw_err                                                                       | complex_bar_lvl | passw_conf_err                               |
      | a           |               | package.core.walletNameAndPasswordSetupStep.firstLevelPasswordStrengthFeedback  | 1               | empty                                        |
      | P@ss        |               | package.core.walletNameAndPasswordSetupStep.firstLevelPasswordStrengthFeedback  | 1               | empty                                        |
      | N_8J@bne    |               | package.core.walletNameAndPasswordSetupStep.secondLevelPasswordStrengthFeedback | 2               | empty                                        |
      | N_8J@bne87  |               | empty                                                                           | 3               | empty                                        |
      | N_8J@bne87A | N_8J@bne87    | empty                                                                           | 4               | core.walletSetupRegisterStep.noMatchPassword |

  @LW-2464
  Scenario: Restore Wallet - All done page - happy path
    Given I click "Restore" button and confirm
    And I go to "Wallet setup" page from "Restore" wallet flow
    When I click "Enter wallet" button
    Then I see LW homepage

  @LW-3063
  Scenario: Extended view - Settings - Analytics enabled/disabled when restoring a wallet
    Given I click "Restore" button on wallet setup page
    And I go to "Mnemonic verification" page from "Restore" wallet flow
    When I click "Enter wallet" button
    And I see LW homepage
    And I open settings from header menu
    Then Analytics toggle is enabled: true
    When I open settings from header menu
    And I click on Remove wallet button
    And I click "Remove wallet" button on "Remove wallet" modal
    And I reject analytics banner on "Get started" page
    Given I click "Restore" button on wallet setup page
    And I go to "Mnemonic verification" page from "Restore" wallet flow
    When I click "Enter wallet" button
    And I see LW homepage
    And I open settings from header menu
    Then Analytics toggle is enabled: false

  @LW-2628
  Scenario: Restore Wallet - autofill words
    Given I click "Restore" button and confirm
    And "Wallet setup" page is displayed
    And I enter wallet name: "ValidName", password: "N_8J@bne87A" and password confirmation: "N_8J@bne87A"
    And I click "Next" button during wallet setup
    Then "Mnemonic verification" page is displayed from "Restore wallet" flow with 24 words
    When I fill mnemonic input with "s"
    Then I see following autocomplete options:
      | sad     |
      | saddle  |
      | sadness |
    And I click header to loose focus
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
    Given I click "Restore" button and confirm
    And "Mnemonic verification" page is displayed from "Restore wallet" flow with 24 words
    When I fill mnemonic input with "abcdefghijklmnopqrstuvwxyz"
    Then the mnemonic input contains the word "abcdefghij"
    And the word in mnemonic input has only 10 characters

  @LW-4613
  Scenario: Restore Wallet - Mnemonic verification - mnemonic length limited to 10 characters - add letter to mnemonic to exceed the limit
    Given I click "Restore" button and confirm
    And "Mnemonic verification" page is displayed from "Restore wallet" flow with 24 words
    When I fill mnemonic input with "abcdefghij"
    And I add characters "x" in word 0
    Then the mnemonic input contains the word "abcdefghij"
    And the word in mnemonic input has only 10 characters

  @LW-3440 @Pending
  Scenario: Restore Wallet - Creating wallet loader disappears after 10s
    Given I click "Restore" button and confirm
    And I am on "Lace terms of use" page and accept terms
#    And I am on "Help us improve your experience" page
    When I click "Agree" button on Analytics page
    And "Wallet setup" page is displayed
    When I enter wallet name: "ValidName"
    And I click "Next" button during wallet setup
    And I enter password: "N_8J@bne87A" and password confirmation: "N_8J@bne87A"
    And I click "Next" button during wallet setup
    And I click "Next" button during wallet setup
    And I am on "Mnemonic verification" last page from "Restore wallet" and filled all words
    And I click "Next" button during wallet setup
    And Creating wallet page finishes in < 10s

  @LW-4546 @LW-4549
  Scenario Outline: Restore wallet - Limit the wallet name input - Realtime error when inputs name with size of <value> character
    Given I click "Restore" button and confirm
    And I go to "Wallet setup" page from "Restore" wallet flow
    When I enter wallet name with size of: <value> characters
    Then wallet name error "core.walletSetupRegisterStep.nameMaxLength" <is_displayed> displayed
    And "Next" button is <is_disabled> during onboarding process
    Examples:
      | value | is_displayed | is_disabled |
      | 20    | is not       | enabled     |
      | 21    | is           | disabled    |

  @LW-4743 @Pending
  Scenario: Restore wallet - Enter and Escape buttons support
    Given I click "Restore" button on wallet setup page
    And "Restoring a multi-address wallet?" modal is displayed
    When I press keyboard Escape button
    Then "Get started" page is displayed
    Given I click "Restore" button on wallet setup page
    And "Restoring a multi-address wallet?" modal is displayed
    When I press keyboard Enter button
#    Then "Legal page" is displayed
    When I press keyboard Enter button
#    Then "Legal page" is displayed
    When I accept "T&C" checkbox
    When I press keyboard Enter button
#    Then "Help us improve your experience" page is displayed
    When I press keyboard Enter button
    Then "Wallet setup" page is displayed
    When I press keyboard Enter button
    Then "Wallet setup" page is displayed
    And I enter wallet name: "ValidName"
    When I press keyboard Enter button
    And I enter password: "N_8J@bne87A" and password confirmation: "N_8J@bne87A"
    When I press keyboard Enter button
    When I press keyboard Enter button
#    Then "Mnemonic verification" page is displayed with words 8 of 24
    When I press keyboard Enter button
#    Then "Mnemonic verification" page is displayed with words 8 of 24
    And I am on "Mnemonic verification" last page from "Restore wallet" and filled all words
    When I press keyboard Enter button
#    Then "All done" page is displayed
    When I press keyboard Enter button
    Then I see LW homepage

  @LW-5835 @Pending
  Scenario: Restore Wallet - "Recovery phrase length page" displayed
    Given I click "Restore" button and confirm
    And "Wallet setup" page is displayed
    And I enter wallet name: "ValidName", password: "N_8J@bne87A" and password confirmation: "N_8J@bne87A"
    And I click "Next" button during wallet setup
    Then "Mnemonic verification" page is displayed from "Restore wallet" flow with 24 words
#    Then "Recovery phrase length page" is displayed and 24 words checkbox is checked

  @LW-5842
  Scenario: Restore Wallet - "Recovery phrase length page" back button
    Given I click "Restore" button and confirm
    And "Wallet setup" page is displayed
    And I enter wallet name: "ValidName", password: "N_8J@bne87A" and password confirmation: "N_8J@bne87A"
    And I click "Next" button during wallet setup
    Then "Mnemonic verification" page is displayed from "Restore wallet" flow with 24 words
    When I click "Back" button during wallet setup
    Then "Wallet setup" page is displayed

  @LW-6080 @LW-5839 @LW-5838 @LW-5839
  Scenario Outline: Restore Wallet - "Recovery phrase length page" restore <mnemonicLength> words happy path
    Given I click "Restore" button and confirm
    And I select <mnemonicLength> word passphrase length
    Then "Mnemonic verification" page is displayed from "Restore wallet" flow with <mnemonicLength> words
    When I enter <mnemonicLength> correct mnemonic words on "Mnemonic verification" page
    And I click "Next" button during wallet setup
    When I enter wallet name: "ValidName", password: "N_8J@bne87A" and password confirmation: "N_8J@bne87A"
    Then "Enter wallet" button is enabled
    When I click "Enter wallet" button
    Then I see LW homepage
    Examples:
      | mnemonicLength |
      | 15             |
      | 12             |

  @LW-6081
  Scenario Outline: Restore Wallet - error message is displayed for <mnemonicLength> passphrase length
    Given I click "Restore" button and confirm
    When I enter wallet name: "ValidName", password: "N_8J@bne87A" and password confirmation: "N_8J@bne87A"
    And I click "Next" button during wallet setup
    And I select <mnemonicLength> word passphrase length
    When I enter <mnemonicLength> incorrect mnemonic words on "Mnemonic verification" page
    Then I see incorrect passphrase error displayed

    Examples:
      | mnemonicLength |
      | 12             |
      | 15             |
      | 24             |

  @LW-4993
  Scenario Outline: Restore Wallet - <mode> theme applied to onboarding pages
    Given I set <mode> theme mode in Local Storage
    When "Get started" page is displayed
    Then I see current onboarding page in <mode> mode
    And I click "Restore" button and confirm
    When "Wallet setup" page is displayed
    Then I see current onboarding page in <mode> mode
    And I enter wallet name: "someWallet", password: "N_8J@bne87A" and password confirmation: "N_8J@bne87A"
    And I click "Next" button during wallet setup
    When "Mnemonic verification" page is displayed from "Restore wallet" flow with 24 words
    Then I see current onboarding page in <mode> mode
    When I enter 24 correct mnemonic words on "Mnemonic verification" page
    And "Enter wallet" button is enabled
    Then I see current onboarding page in <mode> mode

    Examples:
      | mode  |
      | dark  |
      | light |
