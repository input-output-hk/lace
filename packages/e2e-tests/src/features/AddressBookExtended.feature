@AddressBook-extended @Mainnet @Testnet
Feature: Address book - extended view

  Background:
    Given Lace is ready for test

  @LW-4456
  Scenario: Extended-view - Address Book - Empty address book
    Given I don't have any addresses added to my address book in extended mode
    Then I see empty address book

  @LW-4459
  Scenario: Extended-view - Address Book - Addresses list verification
    Given I have 3 addresses in my address book in extended mode
    When I see address count: 3
    Then address list is displayed and each row consists of avatar, name and address

  @LW-4464 @Smoke
  Scenario: Extended-view - Address Book - Add new address "Shelley_manual"
    Given I don't have any addresses added to my address book in extended mode
    And I click "Add address" button on address book page
    And I see "Add new address" drawer in extended mode
    And "Save address" button is disabled on "Add new address" drawer
    When I fill address form with "Shelley_manual" name and "addr_test1qq959a7g4spmkg4gz2yw02622c739p8crt6tzh04qzag992wcj4m99m95nmkgxhk8j0upqp2jzaxxdsj3jf9v4yhv3uqfwr6ja" address
    And I click "Save address" button on "Add new address" drawer
    Then I see a toast with text: "Address added"
    And I see address row with name "Shelley_manual" and address "addr_test1qq959a7g4spmkg4gz2yw02622c739p8crt6tzh04qzag992wcj4m99m95nmkgxhk8j0upqp2jzaxxdsj3jf9v4yhv3uqfwr6ja" on the list in extended mode

  @LW-4464
  Scenario Outline: Extended-view - Address Book - Add new address <wallet_name>
    Given I don't have any addresses added to my address book in extended mode
    And I click "Add address" button on address book page
    And I see "Add new address" drawer in extended mode
    And "Save address" button is disabled on "Add new address" drawer
    When I fill address form with "<wallet_name>" name and "<address>" address
    And I click "Save address" button on "Add new address" drawer
    Then I see a toast with text: "Address added"
    And I see address row with name "<wallet_name>" and address "<address>" on the list in extended mode
    Examples:
      | wallet_name          | address                                                                                                            |
      | Byron_manual         | 37btjrVyb4KC6N6XtRHwEuLPQW2aa9JA89gbnm67PArSi8E7vGeqgA6W1pFBphc1hhrk1WKGPZpUbnvYRimVLRVnUH6M6d3dsVdxYoAC4m7oNj7Dzp |
      | Icarus_manual        | 2cWKMJemoBainaQxNUjUnKDr6mGgSERDRrvKAJzWejubdymYZv1uKedpSYkkehHnSwMCf                                              |
      | 12345678901234567890 | addr_test1qq959a7g4spmkg4gz2yw02622c739p8crt6tzh04qzag992wcj4m99m95nmkgxhk8j0upqp2jzaxxdsj3jf9v4yhv3uqfwr6ja       |
      | !@#$%^&*(){}:,./     | addr_test1qq959a7g4spmkg4gz2yw02622c739p8crt6tzh04qzag992wcj4m99m95nmkgxhk8j0upqp2jzaxxdsj3jf9v4yhv3uqfwr6ja       |
      | ęóąśłżźćń_ASDFÓŚ     | addr_test1qq959a7g4spmkg4gz2yw02622c739p8crt6tzh04qzag992wcj4m99m95nmkgxhk8j0upqp2jzaxxdsj3jf9v4yhv3uqfwr6ja       |

  @LW-4465
  Scenario Outline: Extended-view - Address Book - Add new address and display error message - Name: <name_error> - Address: <address_error>
    Given I don't have any addresses added to my address book in extended mode
    And I click "Add address" button on address book page
    And I see "Add new address" drawer in extended mode
    When I fill address form with "<wallet_name>" name and "<address>" address
    Then Contact "<name_error>" name error and "<address_error>" address error are displayed
    And "Save address" button is disabled on "Add new address" drawer
    Examples:
      | wallet_name               | address                                                                  | name_error                       | address_error                       |
      | too_long_name_123456789   | addr_invalid                                                             | Max 20 Characters                | Invalid Cardano address             |
      | name_ok                   | addr_invalid                                                             | empty                            | Invalid Cardano address             |
      | too_long_name_123456789   | 2cWKMJemoBainaQxNUjUnKDr6mGgSERDRrvKAJzWejubdymYZv1uKedpSYkkehHnSwMCf    | Max 20 Characters                | empty                               |
      | "name followed by space " | "2cWKMJemoBainaQxNUjUnKDr6mGgSERDRrvKAJzWejubdymYZv1uKedpSYkkehHnSwMCf " | Name has unnecessary white space | Address has unnecessary white space |
      | " name preceded by space" | " 2cWKMJemoBainaQxNUjUnKDr6mGgSERDRrvKAJzWejubdymYZv1uKedpSYkkehHnSwMCf" | Name has unnecessary white space | Address has unnecessary white space |

  @LW-4554
  Scenario Outline: Extended-view - Address Book - Add empty name/address and display error message - Name: <name_error> - Address: <address_error>
    Given I don't have any addresses added to my address book in extended mode
    And I click "Add address" button on address book page
    And I see "Add new address" drawer in extended mode
    When I fill address form with "<wallet_name>" name and "<address>" address
    And I fill address form with "<wallet_name2>" name and "<address2>" address
    Then Contact "<name_error>" name error and "<address_error>" address error are displayed
    And "Save address" button is disabled on "Add new address" drawer
    Examples:
      | wallet_name | wallet_name2 | address                                                               | address2                                                              | name_error             | address_error             |
      | name_ok     | empty        | 2cWKMJemoBainaQxNUjUnKDr6mGgSERDRrvKAJzWejubdymYZv1uKedpSYkkehHnSwMCf | 2cWKMJemoBainaQxNUjUnKDr6mGgSERDRrvKAJzWejubdymYZv1uKedpSYkkehHnSwMCf | Name field is required | empty                     |
      | name_ok     | name_ok      | 2cWKMJemoBainaQxNUjUnKDr6mGgSERDRrvKAJzWejubdymYZv1uKedpSYkkehHnSwMCf | empty                                                                 | empty                  | Address field is required |
      | name_ok     | empty        | 2cWKMJemoBainaQxNUjUnKDr6mGgSERDRrvKAJzWejubdymYZv1uKedpSYkkehHnSwMCf | empty                                                                 | Name field is required | Address field is required |

  @LW-4466
  Scenario: Extended-view - Address Book - Remove address
    Given I have 3 addresses in my address book in extended mode
    When I click address on the list with name "Byron"
    And I see address detail page in extended mode with details of "Byron" address
    And I click "Delete" button on address details page
    Then I see delete address modal
    When I click "Delete address" button on delete address modal
    Then I don't see address row with name "Byron" and address "37btjrVyb4KC6N6XtRHwEuLPQW2aa9JA89gbnm67PArSi8E7vGeqgA6W1pFBphc1hhrk1WKGPZpUbnvYRimVLRVnUH6M6d3dsVdxYoAC4m7oNj7Dzp" on the list in extended mode

  @LW-4467
  Scenario: Extended-view - Address Book - Remove address and cancel
    Given I have 3 addresses in my address book in extended mode
    When I click address on the list with name "Byron"
    And I see address detail page in extended mode with details of "Byron" address
    And I click "Delete" button on address details page
    And I click "Cancel" button on delete address modal
    Then I see address detail page in extended mode with details of "Byron" address

  @LW-4468 @Smoke
  Scenario Outline: Extended-view - Address Book - Uniqueness validation and toast display with text <toast_message>
    Given I have 3 addresses in my address book in extended mode
    And I click "Add address" button on address book page
    When I fill address form with "<wallet_name>" name and address from "<wallet_address>" address
    And I click "Save address" button on "Add new address" drawer
    Then I see a toast with message: "<toast_message>"
    Examples:
      | wallet_name | wallet_address | toast_message                               |
      | Byron       | Byron          | addressBook.errors.givenNameAlreadyExist    |
      | SomeWallet  | Byron          | addressBook.errors.givenAddressAlreadyExist |

  @LW-4469
  Scenario: Extended-view - Address Book - Copy address button
    Given I close wallet synced toast
    And I have 3 addresses in my address book in extended mode
    When I click address on the list with name "Byron"
    And I click "Copy" button on address details page
    Then I see a toast with message: "general.clipboard.copiedToClipboard"
    And address is saved to clipboard

  @LW-4470
  Scenario Outline: Extended-view - Address Book - Edit address: <edited_address>
    Given I have 3 addresses in my address book in extended mode
    When I click address on the list with name "<edited_address>"
    And I click "Edit" button on address details page
    And I fill address form with "<wallet_name>" name and "<address>" address
    And I click "Done" button on "Edit address" drawer
    Then I see a toast with text: "Edited successfully"
    And I see address row with name "<wallet_name>" and address "<address>" on the list in extended mode
    Examples:
      | edited_address | wallet_name    | address                                                                                                            |
      | Shelley        | Shelley_edited | addr_test1qq959a7g4spmkg4gz2yw02622c739p8crt6tzh04qzag992wcj4m99m95nmkgxhk8j0upqp2jzaxxdsj3jf9v4yhv3uqfwr6ja       |
      | Byron          | Byron_edited   | 37btjrVyb4KC6N6XtRHwEuLPQW2aa9JA89gbnm67PArSi8E7vGeqgA6W1pFBphc1hhrk1WKGPZpUbnvYRimVLRVnUH6M6d3dsVdxYoAC4m7oNj7Dzp |

  @LW-4471
  Scenario: Extended-view - Address Book - Edit address and cancel
    Given I have 3 addresses in my address book in extended mode
    And I click address on the list with name "Shelley"
    And I click "Edit" button on address details page
    When I click "Cancel" button on "Edit address" drawer
    Then I see address detail page in extended mode with details of "Shelley" address

  @LW-4565
  Scenario Outline: Extended-view - Address Book - Edit wallet name/address and display error message - name error: <name_error>, address error: <address_error>
    Given I have 3 addresses in my address book in extended mode
    And I click address on the list with name "Shelley"
    And I click "Edit" button on address details page
    And I fill address form with "<wallet_name>" name and "<address>" address
    Then Contact "<name_error>" name error and "<address_error>" address error are displayed
    And "Done" button is disabled on "Edit address" drawer
    Examples:
      | wallet_name               | address                                                                                                         | name_error                       | address_error                       |
      | empty                     | addr_test1qq959a7g4spmkg4gz2yw02622c739p8crt6tzh04qzag992wcj4m99m95nmkgxhk8j0upqp2jzaxxdsj3jf9v4yhv3uqfwr6ja    | Name field is required           | empty                               |
      | too_long_name_123456789   | addr_test1qq959a7g4spmkg4gz2yw02622c739p8crt6tzh04qzag992wcj4m99m95nmkgxhk8j0upqp2jzaxxdsj3jf9v4yhv3uqfwr6ja    | Max 20 Characters                | empty                               |
      | " name preceded by space" | addr_test1qq959a7g4spmkg4gz2yw02622c739p8crt6tzh04qzag992wcj4m99m95nmkgxhk8j0upqp2jzaxxdsj3jf9v4yhv3uqfwr6ja    | Name has unnecessary white space | empty                               |
#      | valid wallet name         | empty                                                                                                           | empty                            | Address field is required           | # TODO: Uncomment when LW-7419 is fixed
      | valid wallet name         | invalid_address                                                                                                 | empty                            | Invalid Cardano address             |
      | valid wallet name         | " addr_test1qq959a7g4spmkg4gz2yw02622c739p8crt6tzh04qzag992wcj4m99m95nmkgxhk8j0upqp2jzaxxdsj3jf9v4yhv3uqfwr6ja" | empty                            | Address has unnecessary white space |
      | valid wallet name         | "addr_test1qq959a7g4spmkg4gz2yw02622c739p8crt6tzh04qzag992wcj4m99m95nmkgxhk8j0upqp2jzaxxdsj3jf9v4yhv3uqfwr6ja " | empty                            | Address has unnecessary white space |
#      | empty                     | empty                                                                                                           | Name field is required           | Address field is required           | # TODO: Uncomment when LW-7419 is fixed
      | "name followed by space " | invalid_address                                                                                                 | Name has unnecessary white space | Invalid Cardano address             |

  @LW-4567
  Scenario Outline: Extended-view - Address Book - Edit address book entry - Uniqueness validation and toast display with text <toast_message>
    Given I have 3 addresses in my address book in extended mode
    And I click address on the list with name "Shelley"
    And I click "Edit" button on address details page
    And I fill address form with "<wallet_name>" name and address from "<wallet_address>" address
    And I click "Done" button on "Edit address" drawer
    Then I see a toast with message: "<toast_message>"
    Examples:
      | wallet_name | wallet_address | toast_message                               |
      | Byron       | Byron          | addressBook.errors.givenNameAlreadyExist    |
      | SomeWallet  | Byron          | addressBook.errors.givenAddressAlreadyExist |

  @LW-4535
  Scenario: Extended-view - Address Book - Edit address and click exit button
    Given I have 3 addresses in my address book in extended mode
    And I click address on the list with name "Shelley"
    And I click "Edit" button on address details page
    When I close the drawer by clicking close button
    Then address list is displayed and each row consists of avatar, name and address

  @LW-4536
  Scenario: Extended-view - Address Book - Edit address and click back button
    Given I have 3 addresses in my address book in extended mode
    And I click address on the list with name "Shelley"
    And I click "Edit" button on address details page
    When I close the drawer by clicking back button
    Then I see address detail page in extended mode with details of "Shelley" address

  @LW-4484
  Scenario: Extended-view - Address Book - "About your wallet" widget
    Given I don't have any addresses added to my address book in extended mode
    Then I see Address Book "About your wallet" widget with all relevant items

  @LW-4485
  Scenario Outline: Extended-view - Address Book - "About your wallet" widget item click - <subtitle>
    Given I don't have any addresses added to my address book in extended mode
    When I click on a widget item with subtitle: "<subtitle>"
    Then I see a "<type>" article with title "<subtitle>"
    Examples:
      | type     | subtitle                       |
      | Glossary | What is the Lace address book? |
      | Glossary | What is a saved address?       |

  @LW-4744 @Pending
  @issue=LW-7697
  Scenario: Extended-view - Address Book - Enter and Escape buttons support when editing address
    Given I have 3 addresses in my address book in extended mode
    When I click address on the list with name "Byron"
    Then I see address detail page in extended mode with details of "Byron" address
    When I press keyboard Enter button
    Then I see "Edit address" drawer in extended mode with details of "Byron" address
    When I press keyboard Escape button
    And I see address detail page in extended mode with details of "Byron" address
    When I press keyboard Enter button
    And I fill address form with "Byron_edited" name and "37btjrVyb4KC6N6XtRHwEuLPQW2aa9JA89gbnm67PArSi8E7vGeqgA6W1pFBphc1hhrk1WKGPZpUbnvYRimVLRVnUH6M6d3dsVdxYoAC4m7oNj7Dzp" address
    When I press keyboard Enter button
    Then I see a toast with message: "browserView.addressBook.toast.editAddress"

  @LW-4745
  Scenario: Extended-view - Address Book - Escape button support when closing drawer
    Given I have 3 addresses in my address book in extended mode
    When I click address on the list with name "Byron"
    Then I see address detail page in extended mode with details of "Byron" address
    When I press keyboard Escape button
    Then I do not see address detail page in extended mode with details of "Byron" address

  @LW-4779 @Pending
  @issue=LW-7419
  Scenario: Extended-view - Address Book - Display error message after filling name and clicking outside with empty address
    Given I don't have any addresses added to my address book in extended mode
    And I click "Add address" button on address book page
    And I see "Add new address" drawer in extended mode
    When I fill address form with "name_ok" name
    And I fill address form with "empty" address
    And I click outside address form to lose focus
    Then Contact "empty" name error and "Address field is required" address error are displayed

  @LW-4780 @Pending
  @issue=LW-7419
  Scenario: Extended-view - Address Book - Display error message when adding valid address and clicking outside with empty name field
    Given I don't have any addresses added to my address book in extended mode
    And I click "Add address" button on address book page
    And I see "Add new address" drawer in extended mode
    When I fill address form with "addr_test1qq959a7g4spmkg4gz2yw02622c739p8crt6tzh04qzag992wcj4m99m95nmkgxhk8j0upqp2jzaxxdsj3jf9v4yhv3uqfwr6ja" address
    When I fill address form with "empty" name
    And I click outside address form to lose focus
    Then Contact "Name field is required" name error and "empty" address error are displayed

  @LW-4781  @Pending
  @issue=LW-7419
  Scenario: Extended-view - Address Book - No error is displayed when leaving both fields empty
    Given I don't have any addresses added to my address book in extended mode
    And I click "Add address" button on address book page
    And I see "Add new address" drawer in extended mode
    When I fill address form with "name_ok" name and "addr_test1qq959a7g4spmkg4gz2yw02622c739p8crt6tzh04qzag992wcj4m99m95nmkgxhk8j0upqp2jzaxxdsj3jf9v4yhv3uqfwr6ja" address
    And I clear name field value in address form
    And I clear address field value in address form
    And I click outside address form to lose focus
    Then Contact "empty" name error and "empty" address error are displayed
    And "Save address" button is disabled on "Add new address" drawer

  @LW-7043
  Scenario Outline: Extended-view - Address Book - Add the same contact to the address book for two different networks
    Given I don't have any addresses added to my address book in extended mode
    When I add new address: "<address>" with name: "<wallet_name>" in extended mode
    Then I verify that address: "<address>" with name: "<wallet_name>" has been added in extended mode
    And I switch network to: "Preview" in extended mode
    And I close wallet synced toast
    When I add new address: "<address>" with name: "<wallet_name>" in extended mode
    Then I verify that address: "<address>" with name: "<wallet_name>" has been added in extended mode
    And I switch network to: "Mainnet" in extended mode
    And I close wallet synced toast
    When I add new address: "<address>" with name: "<wallet_name>" in extended mode
    Then I verify that address: "<address>" with name: "<wallet_name>" has been added in extended mode
    Examples:
      | wallet_name   | address                                                                                                      |
      | example_name1 | addr_test1qzngq82mhkzqttqvdk8yl4twk4ea70ja2e7j92x9vqwatds4dm4z5j48w9mjpag2htut4g6pzfxm7x958m3wxjwc8t6q8k6txr |

  @LW-7042
  Scenario Outline: Extended-view - Address Book - Delete an address that is on more than one network
    Given I don't have any addresses added to my address book in extended mode
    And I add new address: "<address>" with name: "<wallet_name>" in extended mode
    And I switch network to: "Preview" in extended mode
    And I add new address: "<address>" with name: "<wallet_name>" in extended mode
    And I switch network to: "Mainnet" in extended mode
    And I add new address: "<address>" with name: "<wallet_name>" in extended mode
    And I switch network to: "Preprod" in extended mode
    And I delete address with name: "<wallet_name>" in extended mode
    Then I see empty address book
    And I switch network to: "Preview" in extended mode
    And I open address book in extended mode
    Then I see address row with name "<wallet_name>" and address "<address>" on the list in extended mode
    And I delete address with name: "<wallet_name>" in extended mode
    And I see empty address book
    And I switch network to: "Mainnet" in extended mode
    And I open address book in extended mode
    Then I see address row with name "<wallet_name>" and address "<address>" on the list in extended mode
    Examples:
      | wallet_name   | address                                                                                                      |
      | example_name2 | addr_test1qzcx0kfmglh9hg5wa7kxzt3c3e8psnm0pus38qth0wgmmljcexj60ge60d8h7nyz9ez0mzgxznr5kr6rfsemdqp74p0q9rw57j |
