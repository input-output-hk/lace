#if __has_include("RCTBridgeModule.h")
#import "RCTBridgeModule.h"
#else
#import <React/RCTBridgeModule.h>
#endif
#import <Foundation/Foundation.h>
#import <ApolloLibrary/ApolloLibrary.h>

NS_ASSUME_NONNULL_BEGIN

@interface RCTApolloModule : NSObject <RCTBridgeModule>

@end

NS_ASSUME_NONNULL_END
