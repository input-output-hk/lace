@OnboardingCreateWallet @Testnet @Mainnet
Feature: Onboarding - Create wallet

  @LW-2426
  Scenario: Create Wallet - Get started page displayed
    Then "Get started" page is displayed

  @LW-2427
  Scenario: Create wallet - Legal page displayed
    Given I click "Create" button on wallet setup page
    Then "Legal page" is displayed

  @LW-2428
  Scenario: Create wallet - Legal page - next button disabled
    Given I click "Create" button on wallet setup page
    Then "Next" button is disabled during onboarding process

  @LW-2429 @Obsolete
  Scenario: Create wallet - Legal page - accept T&C - next button enabled
    Given I click "Create" button on wallet setup page
    When I accept "T&C" checkbox
    Then "Next" button is enabled during onboarding process

  @LW-2430 @Obsolete
  Scenario: Create wallet - Legal page - accept T&C - back button
    Given I click "Create" button on wallet setup page
    When I click "Back" button during wallet setup
    Then "Get started" page is displayed

  @LW-2431 @Obsolete
  Scenario: Create wallet - Help us improve your experience page displayed
    Given I click "Create" button on wallet setup page
    And I am on "Legal page"
    When I click "Next" button during wallet setup
    Then "Help us improve your experience" page is displayed

  @LW-4661
  Scenario: Create wallet - Help us improve your experience - Privacy Policy link
    Given I click "Create" button on wallet setup page
    And I am on "Lace terms of use" page and accept terms
    And I am on "Help us improve your experience" page
    When I click on Privacy Policy link
    Then Privacy Policy is displayed in new tab

  @LW-2432
  Scenario Outline: Create wallet - Help us improve your experience - <button> button
    Given I click "Create" button on wallet setup page
    And I am on "Lace terms of use" page and accept terms
    And I am on "Help us improve your experience" page
    When I click "<button>" button on Analytics page
    Then "Name your wallet" page is displayed
    Examples:
      | button |
      | Skip   |
      | Agree  |

  @LW-2433
  Scenario: Create Wallet - Name your wallet - back button
    Given I click "Create" button on wallet setup page
    And I am on "Name your wallet" page
    When I click "Back" button during wallet setup
    Then "Help us improve your experience" page is displayed

  @LW-2434
  Scenario: Create Wallet - Name your wallet - next button disabled for empty wallet name
    Given I click "Create" button on wallet setup page
    And I am on "Name your wallet" page
    When I enter wallet name: "empty"
    Then "Next" button is disabled during onboarding process

  @LW-2975
  Scenario Outline: Create Wallet - Set password - Recommendation for password: <passw_err>, password: <password>, password confirmation: <password_conf>
    Given I click "Create" button on wallet setup page
    And I am on "Name your wallet" page
    When I enter wallet name: "wallet"
    When I click "Next" button during wallet setup
    And I enter password: "<password>" and password confirmation: "<password_conf>"
    Then Password recommendation: "<passw_err>", complexity bar level: "<complex_bar_lvl>" and password confirmation error: "<passw_conf_err>" are displayed
    Examples:
      | password    | password_conf | passw_err                 | complex_bar_lvl | passw_conf_err                               |
      | a           | empty         | core.password.feedback.1  | 1               | empty                                        |
      | aa          | empty         | core.password.feedback.5  | 1               | empty                                        |
      | Ta          | a             | core.password.feedback.10 | 1               | core.walletSetupRegisterStep.noMatchPassword |
      | P@ss        | empty         | core.password.feedback.13 | 1               | empty                                        |
      | N_8J@bne    | empty         | core.password.feedback.1  | 2               | empty                                        |
      | N_8J@bne87  | empty         | empty                     | 3               | empty                                        |
      | N_8J@bne87A | N_8J@bne87    | empty                     | 4               | core.walletSetupRegisterStep.noMatchPassword |

  @LW-3013
  Scenario: Create Wallet - Mnemonic info - appears correctly after password screen
    Given I click "Create" button on wallet setup page
    And I am on "Name your wallet" page
    And I enter wallet name: "ValidName"
    And I click "Next" button during wallet setup
    When I enter password: "N_8J@bne87A" and password confirmation: "N_8J@bne87A"
    And I click "Next" button during wallet setup
    Then "Mnemonic info" page is displayed
    And "Next" button is enabled during onboarding process

  @LW-3014
  Scenario: Create Wallet - Mnemonic info - Back button click
    Given I navigate to "Mnemonic info" page
    When I click "Back" button during wallet setup
    Then "Wallet name and password" page is displayed in onboarding flow

  @LW-3015
  Scenario: Create Wallet - Mnemonic info - Next button click
    Given I navigate to "Mnemonic info" page
    When I click "Next" button during wallet setup
    Then "Mnemonic writedown" page is displayed with words 8 of 24

  @LW-1553
  Scenario: Create Wallet - Mnemonic info - Subtitle link click
    Given I click "Create" button on wallet setup page
    And I am on "Mnemonic writedown" page
    When I click on "Watch video" link on "Mnemonic writedown" page
    Then I see "Watch video" modal
    When I click "Read More" link in modal
    # Given I navigate to "Mnemonic info" page
    When I click "here." link on "Keeping your wallet secure" page
    Then I see a "FAQ" article with title "What is my recovery phrase?"

  @LW-2251
  Scenario: Create Wallet - Mnemonic info - "Help and support" button click
    Given I navigate to "Mnemonic info" page
    When I click "Help and support" button during wallet setup
    Then I see "Help and support" page

  @LW-2435
  Scenario: Create Wallet - Mnemonic writedown pages - next button
    Given I click "Create" button on wallet setup page
    And I am on "Name your wallet" page
    And I enter wallet name: "ValidName"
    And I click "Next" button during wallet setup
    When I enter password: "N_8J@bne87A" and password confirmation: "N_8J@bne87A"
    And I click "Next" button during wallet setup
    And I click "Next" button during wallet setup
    Then "Mnemonic writedown" page is displayed with words 8 of 24
    When I click "Next" button during wallet setup
    Then "Mnemonic writedown" page is displayed with words 16 of 24
    When I click "Next" button during wallet setup
    Then "Mnemonic writedown" page is displayed with words 24 of 24

  @LW-2436
  Scenario Outline: Create Wallet - Mnemonic writedown - back button from <init_page> to <target_page> mnemonic writedown page
    Given I click "Create" button on wallet setup page
    And I am on "Mnemonic writedown" page with words <init_page> of 24
    When I click "Back" button during wallet setup
    Then "Mnemonic writedown" page is displayed with words <target_page> of 24
    Examples:
      | init_page | target_page |
      | 16        | 8           |
      | 24        | 16          |

  @LW-2437
  Scenario: Create Wallet - Mnemonic writedown - back button to start over and cancel
    Given I click "Create" button on wallet setup page
    And I am on "Mnemonic writedown" page with words 8 of 24
    When I click "Back" button during wallet setup
    And I click "Cancel" button on "Are you sure you want to start again?" modal
    Then "Mnemonic writedown" page is displayed with words 8 of 24
    And I save the words
    And Words 1 - 8 are the same
    And I clear saved words

  @LW-2438
  Scenario: Create Wallet - Mnemonic writedown - back button to start over and new words
    Given I click "Create" button on wallet setup page
    And I am on "Mnemonic writedown" page with words 8 of 24
    When I click "Back" button during wallet setup
    And I click "OK" button on "Are you sure you want to start again?" modal
    Then "Mnemonic info" page is displayed
    When I click "Next" button during wallet setup
    Then "Mnemonic writedown" page is displayed with words 8 of 24
    And I save the words
    And Words 1 - 8 are not the same
    And I clear saved words

  @LW-2439
  Scenario: Create Wallet - Mnemonic verification page displayed
    Given I click "Create" button on wallet setup page
    And I am on "Mnemonic writedown" page with words 24 of 24
    And I click "Next" button during wallet setup
    Then "Mnemonic verification" page is displayed with words 8 of 24
    And "Next" button is disabled during onboarding process

  @LW-2441
  Scenario: Create Wallet - Mnemonic verification - back button to start over and cancel
    Given I click "Create" button on wallet setup page
    And I am on "Mnemonic verification" page with words 8 of 24
    And I click "Back" button during wallet setup
    When I click "Cancel" button on "Are you sure you want to start again?" modal
    Then "Mnemonic verification" page is displayed with words 8 of 24

  @LW-2442
  Scenario: Create Wallet - Mnemonic verification - back button to start over and new words
    Given I click "Create" button on wallet setup page
    And I am on "Mnemonic verification" page with words 8 of 24
    And I click "Back" button during wallet setup
    When I click "OK" button on "Are you sure you want to start again?" modal
    Then "Mnemonic writedown" page is displayed with words 8 of 24

  @LW-2443
  Scenario: Create Wallet - Mnemonic verification - fill all fields - happy path
    Given I click "Create" button on wallet setup page
    And I am on "Mnemonic verification" page from "Create" wallet
    Then "Enter wallet" button is enabled
    # And I am on "Mnemonic verification" page with words 8 of 24
    # When I fill passphrase fields using 24 words mnemonic on 8/24 page
    # And I click "Next" button during wallet setup
    # When I fill passphrase fields using 24 words mnemonic on 16/24 page
    # And I click "Next" button during wallet setup
    # When I fill passphrase fields using 24 words mnemonic on 24/24 page
    # Then "Next" button is enabled during onboarding process
    # When I click "Next" button during wallet setup
    # Then "All done" page is displayed

  @LW-3212
  Scenario Outline: Create Wallet - Mnemonic verification - all empty fields - next disabled - <init_page>
    Given I click "Create" button on wallet setup page
    And I am on "Mnemonic verification" page with words <init_page> of 24
    Then "Next" button is disabled during onboarding process
    Examples:
      | init_page |
      | 8         |
      | 16        |
      | 24        |

  @LW-3213
  Scenario Outline: Create Wallet - Mnemonic verification - clear one of fields - next disabled - <init_page>
    Given I click "Create" button on wallet setup page
    And I am on "Mnemonic verification" page with words <init_page> of 24
    When I fill passphrase fields using 24 words mnemonic on <init_page>/24 page
    Then "Next" button is enabled during onboarding process
    And I clear one random field
    Then "Next" button is disabled during onboarding process
    Examples:
      | init_page |
      | 8         |
      | 16        |
      | 24        |

  @LW-2444
  Scenario: Create Wallet - Mnemonic verification - fill all fields - wrong mnemonic
    Given I click "Create" button on wallet setup page
    And I am on "Mnemonic verification" last page from "Create wallet" and filled all words
    When I add characters "qwe" in word 7
    Then "Next" button is disabled during onboarding process

  @LW-2445 @Smoke
  Scenario: Create Wallet - All done page - happy path
    Given I click "Create" button on wallet setup page
    And I am on "Mnemonic verification" page from "Create" wallet
    When I click "Enter wallet" button
    # And I am on "All done" page
    # When I click "Go to my wallet" button on "All done" page
    Then I see LW homepage

  @LW-3020
  Scenario: Create wallet - Legal page - next button tooltip
    Given I click "Create" button on wallet setup page
    Then "Next" button is disabled during onboarding process
    And I hover over "Next" button
    Then There is tooltip visible

  @LW-3021
  Scenario: Create wallet - Legal page - next button no tooltip
    Given I click "Create" button on wallet setup page
    When I accept "T&C" checkbox
    And I hover over "Next" button
    Then There is no tooltip visible

  @LW-3060
  Scenario Outline: Extended view - Settings - Analytics enabled: <is_enabled> when <wallet_action> a wallet
    Given I click "Create" button on wallet setup page
    And I am on "All done" page with analytics tracking <button> from Create wallet
    And I click "Go to my wallet" button on "All done" page
    And I see LW homepage
    And I open settings from header menu
    Then Analytics toggle is enabled: <is_enabled>
    Examples:
      | is_enabled | button |
      | true       | Agree  |
      | false      | Skip   |

  @LW-2627
  Scenario: Create Wallet - autofill words
    When I click "Create" button on wallet setup page
    Given I am on "Mnemonic verification" page with words 8 of 24
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

  @LW-3437
  Scenario: Create Wallet - Creating wallet loader disappears after 10s
    Given I click "Create" button on wallet setup page
    And I am on "Mnemonic verification" last page from "Create wallet" and filled all words
    When I click "Next" button during wallet setup
    And Creating wallet page finishes in < 10s

  @LW-4543 @LW-4548
  Scenario Outline: Create wallet - Limit the wallet name input - Realtime error when inputs name with size of <value> character
    Then "Get started" page is displayed
    When I click "Create" button on wallet setup page
    Then "Legal page" is displayed
    Then I accept "T&C" checkbox
    When I click "Next" button during wallet setup
    Then "Help us improve your experience" page is displayed
    When I click "<button>" button on Analytics page
    Then "Name your wallet" page is displayed
    When I enter wallet name with size of: <value> characters
    Then wallet name error "core.walletSetupRegisterStep.nameMaxLength" <is_displayed> displayed
    And "Next" button is <state> during onboarding process
    Examples:
      | button | value | is_displayed | state    |
      | Skip   | 20    | is not       | enabled  |
      | Agree  | 21    | is           | disabled |

  @LW-5844
  Scenario Outline: "Get started" page - Legal links - click on <legal_link> link
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
    Then I see current onboarding page in <mode> mode
    And I click "Create" button on wallet setup page
    When "Legal page" is displayed
    Then I see current onboarding page in <mode> mode
    And I accept "T&C" checkbox
    And I click "Next" button during wallet setup
    When "Help us improve your experience" page is displayed
    Then I see current onboarding page in <mode> mode
    And I click "Next" button during wallet setup
    When "Name your wallet" page is displayed
    Then I see current onboarding page in <mode> mode
    When I enter wallet name: "someWallet"
    And I click "Next" button during wallet setup
    When "Wallet name and password" page is displayed in onboarding flow
    Then I see current onboarding page in <mode> mode
    And I enter password: "N_8J@bne87A" and password confirmation: "N_8J@bne87A"
    And I click "Next" button during wallet setup
    When "Mnemonic info" page is displayed
    Then I see current onboarding page in <mode> mode
    And I click "Next" button during wallet setup
    Then "Mnemonic writedown" page is displayed with words 8 of 24
    Then I see current onboarding page in <mode> mode
    And I save the words
    And I click "Next" button during wallet setup
    Then "Mnemonic writedown" page is displayed with words 16 of 24
    Then I see current onboarding page in <mode> mode
    And I save the words
    And I click "Next" button during wallet setup
    Then "Mnemonic writedown" page is displayed with words 24 of 24
    Then I see current onboarding page in <mode> mode
    And I save the words
    And I click "Next" button during wallet setup
    When "Mnemonic verification" page is displayed with words 8 of 24
    Then I see current onboarding page in <mode> mode
    And I fill saved words 8 of 24
    And I click "Next" button during wallet setup
    When "Mnemonic verification" page is displayed with words 16 of 24
    Then I see current onboarding page in <mode> mode
    And I fill saved words 16 of 24
    And I click "Next" button during wallet setup
    When "Mnemonic verification" page is displayed with words 24 of 24
    Then I see current onboarding page in <mode> mode
    And I fill saved words 24 of 24
    And I click "Next" button during wallet setup
    Then "All done" page is displayed
    Then I see current onboarding page in <mode> mode
    And I clear saved words
    Examples:
      | mode  |
      | dark  |
      | light |

  @LW-8500 @Pending
  @issue=LW-8890
  Scenario: Create Wallet - Mnemonic verification - incorrect word
    Given I click "Create" button on wallet setup page
    And I am on "Mnemonic verification" page with words 8 of 24
    When I fill passphrase fields using 24 words mnemonic on 8/24 page
    And I change one random field
    Then I see incorrect passphrase error displayed
    And "Next" button is disabled during onboarding process
    When I restore previously changed mnemonic word
    Then I do not see incorrect passphrase error displayed
    And "Next" button is enabled during onboarding process

  @LW-8501
  Scenario: Create Wallet - Mnemonic verification - incorrect word order
    Given I click "Create" button on wallet setup page
    And I am on "Mnemonic verification" page with words 8 of 24
    And I fill passphrase fields using 24 words mnemonic in incorrect order on 8/24 page
    Then I see incorrect passphrase error displayed
    And "Next" button is disabled during onboarding process
    When I fill passphrase fields using 24 words mnemonic on 8/24 page
    Then I do not see incorrect passphrase error displayed
    And "Next" button is enabled during onboarding process
