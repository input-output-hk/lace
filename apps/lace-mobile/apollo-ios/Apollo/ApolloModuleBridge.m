// ApolloModuleBridge.m
#if __has_include("RCTBridgeModule.h")
#import "RCTBridgeModule.h"
#else
#import <React/RCTBridgeModule.h>
#endif

@interface RCT_EXTERN_MODULE(ApolloModule, NSObject)

RCT_EXTERN_METHOD(
                  derivePublicKey:(NSString *)pubKeyHex
                  role:(nonnull NSNumber *)role
                  index:(nonnull NSNumber *)index
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject
                  )

RCT_EXTERN_METHOD(
                  blake2bHash:(NSString *)inputHex
                  outLen:(nonnull NSNumber *)outLen
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject
                  )

RCT_EXTERN__BLOCKING_SYNCHRONOUS_METHOD(derivePublicKeySync:(NSString *)pubKeyHex
                                      role:(nonnull NSNumber *)role
                                      index:(nonnull NSNumber *)index)

RCT_EXTERN__BLOCKING_SYNCHRONOUS_METHOD(blake2bHashSync:(NSString *)inputHex
                                      outLength:(nonnull NSNumber *)outLen)
@end
