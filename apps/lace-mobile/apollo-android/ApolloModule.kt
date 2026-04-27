package io.lace.mobilewallet

import com.facebook.react.bridge.*
import org.hyperledger.identus.apollo.derivation.EdHDPubKey
import org.hyperledger.identus.apollo.derivation.BigIntegerWrapper
import org.hyperledger.identus.apollo.utils.decodeHex
import org.hyperledger.identus.apollo.utils.toHexString
import kotlinx.coroutines.*
import org.hyperledger.identus.apollo.derivation.EdHDKey
import org.hyperledger.identus.apollo.utils.KMMEdPrivateKey
import org.bouncycastle.crypto.digests.Blake2bDigest
import java.lang.Exception

class ApolloModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "ApolloModule"

  @ReactMethod
  fun derivePublicKey(pubKeyHex: String, role: Int, index: Int, promise: Promise) {
    CoroutineScope(Dispatchers.Default).launch {
      try {
        val result = deriveKeyHex(pubKeyHex, role, index)
        promise.resolve(result)
      } catch (e: Exception) {
        promise.reject("DERIVE_ERROR", "Failed to derive public key", e)
      }
    }
  }

  @ReactMethod
  fun blake2bHash(inputHex: String, outLen: Int, promise: Promise) {
    CoroutineScope(Dispatchers.Default).launch {
      try {
        val hexResult = blake2bHexSync(inputHex, outLen)
        promise.resolve(hexResult)
      } catch (e: Exception) {
        promise.reject("BLAKE2B_ERROR", "Failed to compute blake2b: ${e.message}", e)
      }
    }
  }

  private fun computeBlake2b(input: ByteArray, outLen: Int): ByteArray {
    val digest = Blake2bDigest(outLen * 8) // outLen in bytes → bits
    digest.update(input, 0, input.size)
    val output = ByteArray(outLen)
    digest.doFinal(output, 0)
    return output
  }


  @Throws(Exception::class)
  private fun deriveKeyHex(pubKeyHex: String, role: Int, index: Int): String {
    val data = pubKeyHex.decodeHex()
    if (data.size != 64) {
      throw Exception("Invalid extended public key: expected 64 bytes, got ${data.size}")
    }

    val pubKey = data.copyOfRange(0, 32).toKotlinByteArray()
    val chainCode = data.copyOfRange(32, 64).toKotlinByteArray()
    var key = EdHDPubKey(pubKey, chainCode, 0, BigIntegerWrapper(0))
    key = key.deriveChild(BigIntegerWrapper(role))
    key = key.deriveChild(BigIntegerWrapper(index))
    return key.publicKey.toHexString()
  }

  @Throws(Exception::class)
  private fun derivePrivateKeyFromSeed(pubKeyHex: String, role: Int, index: Int): String {
    val seed = pubKeyHex.decodeHex().toKotlinByteArray()
    val masterKey = EdHDKey.initFromSeed(seed)
    val intermediate = masterKey.deriveChild(BigIntegerWrapper(role))
    val child = intermediate.deriveChild(BigIntegerWrapper(index))
    val privKey = child.privateKey ?: throw Exception("Private key derivation failed")
    val edPriv = KMMEdPrivateKey(privKey)
    val edPub = edPriv.publicKey()
    return edPub.raw.toHexString()
  }

  @Throws(Exception::class)
  private fun blake2bHexSync(inputHex: String, outLen: Int): String {
    val inputBytes = inputHex.decodeHex()
    val hashBytes = computeBlake2b(inputBytes, outLen)
    return hashBytes.joinToString("") { "%02x".format(it) }
  }

  /**
   * React Native (Android) blocking synchronous methods.
   * iOS exposes these as @objc(derivePublicKeySync:role:index:) and @objc(blake2bHashSync:outLength:).
   * We must export them similarly so JS can call them synchronously when needed.
   */
  @ReactMethod(isBlockingSynchronousMethod = true)
  fun derivePublicKeySync(pubKeyHex: String, role: Int, index: Int): String {
    return try {
      deriveKeyHex(pubKeyHex, role, index)
    } catch (e: Exception) {
      ""
    }
  }

  @ReactMethod(isBlockingSynchronousMethod = true)
  fun blake2bHashSync(inputHex: String, outLen: Int): String {
    return try {
      blake2bHexSync(inputHex, outLen)
    } catch (e: Exception) {
      ""
    }
  }

}

fun String.hexToByteArray(): ByteArray {
  require(length % 2 == 0) { "Invalid hex string" }
  return chunked(2).map { it.toInt(16).toByte() }.toByteArray()
}

fun ByteArray.toHex(): String = joinToString("") { "%02x".format(it) }

fun ByteArray.toKotlinByteArray(): ByteArray {
  return this;
}
