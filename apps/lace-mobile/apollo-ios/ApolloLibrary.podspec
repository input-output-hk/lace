Pod::Spec.new do |spec|
  spec.name         = 'ApolloLibrary'
  spec.version      = '1.7.2'
  spec.summary      = 'Apollo XCFramework distributed as a CocoaPod.'
  spec.homepage     = 'https://github.com/hyperledger-identus/apollo'
  spec.license      = { :type => 'MIT', :file => 'LICENSE' }
  spec.author       = 'Hyperledger Identus'
  # Vendored copy of the upstream podspec with an added :sha256 so CocoaPods
  # verifies the fetched xcframework before use — the upstream spec pins only
  # the mutable release-asset URL, and this xcframework performs BIP32-Ed25519
  # key derivation (NWL Mobile audit M-308). Do not hand-edit the version / url
  # / digest below; regenerate with:
  #   ./update-apollo-podspec.sh <version>
  # Android resolves the same library via the checksummed Maven coordinate
  # org.hyperledger.identus:apollo-android — keep the two versions aligned.
  spec.source       = {
    :http   => 'https://github.com/hyperledger-identus/apollo/releases/download/v1.7.2/ApolloLibrary.xcframework.zip',
    :sha256 => 'de9a37ddc1d4171afe922a289fd85f0d509674f26d1febddc71a134a7cc0586e'
  }
  spec.vendored_frameworks = 'ApolloLibrary.xcframework'
  spec.platform     = :ios, '13.0'
  spec.ios.deployment_target = '13.0'
  spec.osx.deployment_target = '11.0'
end
