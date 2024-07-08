@OnboardingCreateWallet @Onboarding @Testnet @Mainnet
Feature: Onboarding - Create wallet

  @LW-2426
  Scenario: Create Wallet - Get started page displayed
    Then "Get started" page is displayed

  @LW-10069
  Scenario Outline: "Get started" page - Agreement text - Legal links - click on <legal_link> link
    When "Get started" page is displayed
    And I click on "<legal_link>" legal link on "Main page"
    Then "<legal_link>" is displayed in new tab
    Examples:
      | legal_link       |
      | Privacy policy   |
      | Terms of service |


  @LW-2433
  Scenario: Create Wallet - Wallet setup page - back button
    Given I click "Create" button on wallet setup page
    And I go to "Wallet setup" page from "Create" wallet flow
    When I click "Back" button during wallet setup
    Then "Mnemonic verification" page is displayed from "Create wallet" flow with 24 words

  @LW-2434
  Scenario: Create Wallet - Name your wallet - Enter wallet button disabled for empty wallet name
    Given I click "Create" button on wallet setup page
    And I go to "Wallet setup" page from "Create" wallet flow
    When I enter wallet name: "empty"
    Then "Next" button is disabled during onboarding process

  @LW-2975
  Scenario Outline: Create Wallet - Set password - Recommendation for password: <passw_err>, password: <password>, password confirmation: <password_conf>
    Given I click "Create" button on wallet setup page
    And I go to "Wallet setup" page from "Create" wallet flow and not fill values
    When I enter wallet name: "wallet", password: "<password>" and password confirmation: "<password_conf>"
    Then Password recommendation: "<passw_err>", complexity bar level: "<complex_bar_lvl>" and password confirmation error: "<passw_conf_err>" are displayed
    Examples:
      | password    | password_conf | passw_err                                                               | complex_bar_lvl | passw_conf_err                               |
      | a           |               | core.walletNameAndPasswordSetupStep.firstLevelPasswordStrengthFeedback  | 1               | empty                                        |
      | P@ss        |               | core.walletNameAndPasswordSetupStep.firstLevelPasswordStrengthFeedback  | 1               | empty                                        |
      | N_8J@bne    |               | core.walletNameAndPasswordSetupStep.secondLevelPasswordStrengthFeedback | 2               | empty                                        |
      | N_8J@bne87  |               | empty                                                                   | 3               | empty                                        |
      | N_8J@bne87A | N_8J@bne87    | empty                                                                   | 4               | core.walletSetupRegisterStep.noMatchPassword |

  @LW-3013
  Scenario: Create Wallet - Mnemonic writedown page - appears correctly after wallet setup page
    Given I click "Create" button on wallet setup page
    Then "Mnemonic writedown" page is displayed with 24 words
    And "Next" button is enabled during onboarding process

  @LW-3014
  Scenario: Create Wallet - Mnemonic writedown - Back button click
    Given I click "Create" button on wallet setup page
    When I click "Back" button during wallet setup
    Then "Get started" page is displayed

  @LW-1553
  Scenario: Create Wallet - Mnemonic writedown - Subtitle link click
    Given I click "Create" button on wallet setup page
    When I click on "Watch video" link on "Mnemonic writedown" page
    Then I see "Watch video" modal
    When I click "Read More" link in modal
    Then I see a "FAQ" article with title "What is my recovery phrase?"

  @LW-2251
  Scenario: Create Wallet - Mnemonic writedown - "Help and support" button click
    Given I click "Create" button on wallet setup page
    And "Mnemonic writedown" page is displayed with 24 words
    When I click "Help and support" button during wallet setup
    Then I see "Help and support" page

  @LW-2435
  Scenario: Create Wallet - Mnemonic writedown page - next button
    Given I click "Create" button on wallet setup page
    And "Mnemonic writedown" page is displayed with 24 words
    When I click "Next" button during wallet setup
    Then "Mnemonic verification" page is displayed from "Create wallet" flow with 24 words

  @LW-2439
  Scenario: Create Wallet - Mnemonic verification page displayed
    Given I click "Create" button on wallet setup page
    And "Mnemonic writedown" page is displayed with 24 words
    And I click "Next" button during wallet setup
    Then "Mnemonic verification" page is displayed from "Create wallet" flow with 24 words
    And "Next" button is disabled during onboarding process

  @LW-2441
  Scenario: Create Wallet - Mnemonic verification - back button to start over and cancel
    Given I click "Create" button on wallet setup page
    And "Mnemonic writedown" page is displayed with 24 words
    And I click "Next" button during wallet setup
    Then "Mnemonic verification" page is displayed from "Create wallet" flow with 24 words
    And I click "Back" button during wallet setup
    When I click "Cancel" button on "Are you sure you want to start again?" modal
    Then "Mnemonic verification" page is displayed from "Create wallet" flow with 24 words

  @LW-2442
  Scenario: Create Wallet - Mnemonic verification - back button to start over and new words
    Given I click "Create" button on wallet setup page
    And "Mnemonic writedown" page is displayed with 24 words
    And I click "Next" button during wallet setup
    Then "Mnemonic verification" page is displayed from "Create wallet" flow with 24 words
    And I click "Back" button during wallet setup
    When I click "OK" button on "Are you sure you want to start again?" modal
    Then "Mnemonic writedown" page is displayed with 24 words

  @LW-2443
  Scenario: Create Wallet - Mnemonic verification - fill all fields - happy path
    Given I click "Create" button on wallet setup page
    And I go to "Mnemonic verification" page from "Create" wallet flow and fill values
    Then "Next" button is enabled during onboarding process

  @LW-3212
  Scenario: Create Wallet - Mnemonic verification - all empty fields - next disabled
    Given I click "Create" button on wallet setup page
    And I go to "Mnemonic verification" page from "Create" wallet flow and not fill values
    Then "Next" button is disabled during onboarding process

  @LW-3213
  Scenario: Create Wallet - Mnemonic verification - clear one of fields - next disabled
    Given I click "Create" button on wallet setup page
    And I go to "Mnemonic verification" page from "Create" wallet flow and fill values
    Then "Next" button is enabled during onboarding process
    And I clear one random field
    Then "Next" button is disabled during onboarding process

  @LW-2444
  Scenario: Create Wallet - Mnemonic verification - fill all fields - wrong mnemonic
    Given I click "Create" button on wallet setup page
    And I go to "Mnemonic verification" page from "Create" wallet flow and fill values
    When I add characters "qwe" in word 7
    Then "Next" button is disabled during onboarding process

  @LW-2445 @Smoke
  Scenario: Create Wallet - All done page - happy path
    Given I click "Create" button on wallet setup page
    And I go to "Wallet setup" page from "Create" wallet flow and fill values
    When I click "Enter wallet" button
    Then I see LW homepage

  @LW-3060
  Scenario: Extended view - Settings - Analytics enabled/disabled when creating a wallet
    Given I click "Create" button on wallet setup page
    And I go to "Mnemonic verification" page from "Create" wallet flow and fill values
    And I click "Next" button during wallet setup
    And I enter wallet name: "ValidName", password: "N_8J@bne87A" and password confirmation: "N_8J@bne87A"
    When I click "Enter wallet" button
    And I see LW homepage
    And I open settings from header menu
    Then Analytics toggle is enabled: true
    When I open settings from header menu
    And I click on Remove wallet button
    And I click "Remove wallet" button on "Remove wallet" modal
    And I reject analytics banner on "Get started" page
    Given I click "Create" button on wallet setup page
    And I go to "Mnemonic verification" page from "Create" wallet flow and fill values
    And I click "Next" button during wallet setup
    And I enter wallet name: "ValidName", password: "N_8J@bne87A" and password confirmation: "N_8J@bne87A"
    When I click "Enter wallet" button
    And I see LW homepage
    And I open settings from header menu
    Then Analytics toggle is enabled: false

  @LW-2627
  Scenario: Create Wallet - autofill words
    When I click "Create" button on wallet setup page
    And "Mnemonic writedown" page is displayed with 24 words
    And I click "Next" button during wallet setup
    Then "Mnemonic verification" page is displayed from "Create wallet" flow with 24 words
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

  @LW-4543 @LW-4548
  Scenario Outline: Create wallet - Limit the wallet name input - Realtime error when inputs name with size of <value> character
    When I click "Create" button on wallet setup page
    And I go to "Wallet setup" page from "Create" wallet flow
    Then "Wallet setup" page is displayed
    When I enter wallet name with size of: <value> characters
    Then wallet name error "core.walletSetupRegisterStep.nameMaxLength" <is_displayed> displayed
    And "Next" button is <is_disabled> during onboarding process
    Examples:
      | value | is_displayed | is_disabled |
#      | 20    | is not       | enabled     | TODO: uncomment when LW-10695 is resolved
      | 21    | is           | disabled    |

  @LW-5844
  Scenario Outline: "Get started" page - Legal links in footer - click on <legal_link> link
    When "Get started" page is displayed
    And I click on "<legal_link>" legal link
    Then "<legal_link>" is displayed in new tab
    Examples:
      | legal_link       |
      | Cookie policy    |
      | Privacy policy   |
      | Terms of service |

  @LW-4993
  Scenario Outline: Create Wallet - <mode> theme applied to onboarding pages
    Given I set <mode> theme mode in Local Storage
    When "Get started" page is displayed
    And I click "Create" button on wallet setup page
    Then I see current onboarding page in <mode> mode
    When "Mnemonic writedown" page is displayed with 24 words
    Then I see current onboarding page in <mode> mode
    And I save mnemonic words
    And I click "Next" button during wallet setup
    When "Mnemonic verification" page is displayed from "Create wallet" flow with 24 words
    Then I see current onboarding page in <mode> mode
    And I enter saved mnemonic words
    And I click "Next" button during wallet setup
    When "Wallet setup" page is displayed
    Then I see current onboarding page in <mode> mode
    And I enter wallet name: "someWallet", password: "N_8J@bne87A" and password confirmation: "N_8J@bne87A"
    Then "Enter wallet" button is enabled
    And I see current onboarding page in <mode> mode
    And I clear saved words
    Examples:
      | mode  |
      | dark  |
      | light |

  @LW-8500
  Scenario: Create Wallet - Mnemonic verification - incorrect word
    Given I click "Create" button on wallet setup page
    And I go to "Mnemonic verification" page from "Create" wallet flow and fill values
    And I change one random field
    Then I see incorrect passphrase error displayed
    And "Next" button is disabled during onboarding process
    When I restore previously changed mnemonic word
    Then I do not see incorrect passphrase error displayed
    And "Next" button is enabled during onboarding process

  @LW-8501
  Scenario: Create Wallet - Mnemonic verification - incorrect word order
    Given I click "Create" button on wallet setup page
    Then "Mnemonic writedown" page is displayed with 24 words
    And I save mnemonic words
    And I click "Next" button during wallet setup
    When I fill passphrase fields using saved 24 words mnemonic in incorrect order
    Then I see incorrect passphrase error displayed
    And "Next" button is disabled during onboarding process
    When I enter saved mnemonic words
    Then "Next" button is enabled during onboarding process

  @LW-10138
  Scenario: Create Wallet - Analytics banner is displayed correctly
    Given I enable showing Analytics consent banner
    Then I see Analytics banner displayed correctly

  @LW-10452
  Scenario: Create wallet - Copy and Paste from clipboard has a tooltip
    Given I click "Create" button on wallet setup page
    And "Mnemonic writedown" page is displayed with 24 words
    And I hover over "Copy to clipboard" button
    Then I see clipboard tooltip with information about copying and pasting words
    And I click on "clipboard tooltip link"
    Then I see a "FAQ" article with title "Best practices for using the “copy to clipboard” and “paste from clipboard” recovery phrase features"
    And I click "Next" button during wallet setup
    Then "Mnemonic verification" page is displayed from "Create wallet" flow with 24 words
    And I hover over "Paste from clipboard" button
    Then I see clipboard tooltip with information about copying and pasting words
    And I click on "clipboard tooltip link"
    Then I see a "FAQ" article with title "Best practices for using the “copy to clipboard” and “paste from clipboard” recovery phrase features"
