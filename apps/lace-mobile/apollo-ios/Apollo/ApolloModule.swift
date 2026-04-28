import Foundation
import ApolloLibrary
import React
import Blake2

@objc(ApolloModule)
class ApolloModule: NSObject {
  
  static func moduleName() -> String! {
    return "ApolloModule"
  }
  
  static func requiresMainQueueSetup() -> Bool {
    return false
  }
  
  @objc
  func derivePublicKey(
    _ pubKeyHex: String,
    role: NSNumber,
    index: NSNumber,
    resolver: @escaping RCTPromiseResolveBlock,
    rejecter: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.global(qos: .userInitiated).async {
      do {
        let result = try Self.deriveKeyHexSync2(pubKeyHex,
                                                role: role.int32Value,
                                                index: index.int32Value)
        resolver(result)
      } catch {
        rejecter("DERIVE_ERROR", "Failed to derive public key: \(error.localizedDescription)", error)
      }
    }
  }
  
  @objc func blake2bHash(
    _ inputHex: String,
    outLen: NSNumber,
    resolver: @escaping RCTPromiseResolveBlock,
    rejecter: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.global(qos: .userInitiated).async {
      do {
        let result = try Self.blake2bHexSync(inputHex, outLength: outLen.intValue)
        resolver(result)
      } catch {
        rejecter("CRYPTO_ERROR",
                 "blake2bHash falló: \(error.localizedDescription)",
                 error)
      }
    }
  }
  
  static func deriveKeyHexSync2(_ pubKeyHex: String, role: Int32, index: Int32) throws -> String {
    
    guard let extendedKeyData = Data(hex: pubKeyHex), extendedKeyData.count == 64 else {
      throw NSError(domain: "CryptoNative", code: 0,
                    userInfo: [NSLocalizedDescriptionKey: "Extended public key inválido o longitud != 64 bytes"])
    }
    
    let publicKeyData = extendedKeyData.prefix(32)
    let chainCodeData = extendedKeyData.dropFirst(32)
    
    guard publicKeyData.count == 32, chainCodeData.count == 32 else {
      throw NSError(domain: "CryptoNative", code: 101,
                    userInfo: [NSLocalizedDescriptionKey: "Public key or chain code must be 32 bytes"])
    }
    
    let pubKeyArr = publicKeyData.toKotlinByteArray()
    let chainCodeArr = chainCodeData.toKotlinByteArray()

    let hdPubKey = EdHDPubKey(
      publicKey: pubKeyArr,
      chainCode: chainCodeArr,
      depth: 0,
      index: BigIntegerWrapper(int: 0)
    )
    
    let roleKey = hdPubKey.deriveChild(wrappedIndex: BigIntegerWrapper(int: role))
    let finalKey = roleKey.deriveChild(wrappedIndex: BigIntegerWrapper(int: index))

    let pubHex = finalKey.publicKey.toData().hexEncodedString()
    return pubHex
  }
  
  static func deriveKeyHexSync(_ pubKeyHex: String,
                               role: Int32,
                               index: Int32) throws -> String {
    guard let seedData = Data(hex: pubKeyHex), seedData.count == 64 else {
      throw NSError(domain: "CryptoNative", code: 0,
                    userInfo: [NSLocalizedDescriptionKey: "Seed hex inválido o longitud != 64 bytes"])
    }
    
    let seedArr = KotlinByteArray(size: Int32(seedData.count))
    seedData.withUnsafeBytes { rawBuf in
      let src = rawBuf.bindMemory(to: Int8.self)
      for i in 0..<seedData.count {
        seedArr.set(index: Int32(i), value: src[i])
      }
    }
    
    let masterKey: EdHDKey
    do {
      masterKey = EdHDKey.Companion.shared.doInitFromSeed(seed: seedArr)
    } catch {
      throw NSError(domain: "CryptoNative", code: 1,
                    userInfo: [NSLocalizedDescriptionKey: "doInitFromSeed falló: \(error)"])
    }
    
    let roleWrapper = BigIntegerWrapper(int: role)
    let intermediateKey = masterKey.deriveChild(wrappedIndex: roleWrapper)
    
    let indexWrapper = BigIntegerWrapper(int: index)
    let childKey = intermediateKey.deriveChild(wrappedIndex: indexWrapper)
    
    guard let privArr = childKey.privateKey as KotlinByteArray? else {
      throw NSError(domain: "CryptoNative", code: 2,
                    userInfo: [NSLocalizedDescriptionKey: "privateKey derivada nula"])
    }
    
    let edPriv: KMMEdPrivateKey
    do {
      edPriv = try KMMEdPrivateKey(raw: privArr)
    } catch {
      throw NSError(domain: "CryptoNative", code: 3,
                    userInfo: [NSLocalizedDescriptionKey: "KMMEdPrivateKey init falló: \(error)"])
    }
    let edPub: KMMEdPublicKey
    do {
      edPub = try edPriv.publicKey()
    } catch {
      throw NSError(domain: "CryptoNative", code: 4,
                    userInfo: [NSLocalizedDescriptionKey: "publicKey() falló: \(error)"])
    }
    let pubArr = edPub.raw
    
    var pubData = Data(count: Int(pubArr.size))
    pubData.withUnsafeMutableBytes { rawPtr in
      let dst = rawPtr.bindMemory(to: UInt8.self).baseAddress!
      for i in 0..<pubArr.size {
        dst[Int(i)] = UInt8(bitPattern: pubArr.get(index: Int32(i)))
      }
    }
    let pubHex = pubData.hexEncodedString()
    return pubHex
  }
  
  
  static func blake2bHexSync(_ inputHex: String, outLength: Int) throws -> String {
    guard let inputData = Data(hex: inputHex) else {
      throw NSError(domain: "CryptoNative", code: 2,
                    userInfo: [NSLocalizedDescriptionKey: "Hex inválido"])
    }
    let hashBytes = try Blake2b.hash(size: outLength, data: [UInt8](inputData))
    return Data(hashBytes).hexEncodedString()
  }
  
  static func deriveFromPath(hdPubKey: EdHDPubKey, path: String) throws -> EdHDPubKey {
    let regex = try NSRegularExpression(pattern: #"^[mM](/(\d+)')*$"#)
    let fullPath = path.trimmingCharacters(in: .whitespaces)

    guard fullPath.starts(with: "m") || fullPath.starts(with: "M") else {
      throw NSError(domain: "CryptoNative", code: 1, userInfo: [NSLocalizedDescriptionKey: "Path must start with 'm'"])
    }

    let parts = fullPath
      .replacingOccurrences(of: "m/", with: "")
      .split(separator: "/")

    var current = hdPubKey

    for part in parts {
      let hardened = part.hasSuffix("'")
      let indexString = part.replacingOccurrences(of: "'", with: "")
      guard let indexInt = Int32(indexString) else {
        throw NSError(domain: "CryptoNative", code: 2, userInfo: [NSLocalizedDescriptionKey: "Invalid index \(part)"])
      }

      if hardened {
        throw NSError(domain: "CryptoNative", code: 3, userInfo: [NSLocalizedDescriptionKey: "Cannot derive hardened index from public key"])
      }

      current = current.deriveChild(wrappedIndex: BigIntegerWrapper(int: indexInt))
    }

    return current
  }
  

  @objc(derivePublicKeySync:role:index:)
  static func derivePublicKeySync(_ pubKeyHex: String,
                                  role: NSNumber,
                                  index: NSNumber) -> String {
    do {
      return try deriveKeyHexSync(pubKeyHex,
                                  role: role.int32Value,
                                  index: index.int32Value)
    } catch {
      return ""
    }
  }
  
  @objc(blake2bHashSync:outLength:)
  static func blake2bHashSync(_ inputHex: String,
                              outLength: NSNumber) -> String {
    do {
      return try blake2bHexSync(inputHex, outLength: outLength.intValue)
    } catch {
      return ""
    }
  }
  
  
}

extension Data {
  init?(hex: String) {
    let cleanHex = hex.lowercased()
    let len = cleanHex.count / 2
    guard cleanHex.count % 2 == 0 else { return nil }
    var data = Data(capacity: len)
    var i = cleanHex.startIndex
    for _ in 0..<len {
      let j = cleanHex.index(i, offsetBy: 2)
      let byteString = cleanHex[i..<j]
      guard let num = UInt8(byteString, radix: 16) else { return nil }
      data.append(num)
      i = j
    }
    self = data
  }
  func hexEncodedString() -> String {
    return map { String(format: "%02x", $0) }.joined()
  }
}

extension Data {
  func toKotlinByteArray() -> KotlinByteArray {
    let array = KotlinByteArray(size: Int32(self.count))
    self.withUnsafeBytes { bufferPointer in
      for (index, byte) in bufferPointer.enumerated() {
        array.set(index: Int32(index), value: Int8(bitPattern: byte))
      }
    }
    return array
  }

}

extension Array where Element == Int8 {
  func toKotlinByteArray() -> KotlinByteArray {
    let result = KotlinByteArray(size: Int32(count))
    for index in indices {
      result.set(index: Int32(index), value: self[index])
    }
    return result
  }
}

extension KotlinByteArray {
  func toData() -> Data {
    let kotlinByteArray = self
    var data = Data(count: Int(kotlinByteArray.size))
    for index in data.indices {
      data[index] = UInt8(bitPattern: kotlinByteArray.get(index: Int32(index)))
    }
    return data
  }
}
