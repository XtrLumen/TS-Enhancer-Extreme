package io.github.xtrlumen.vbmeta.execute

import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import org.bouncycastle.asn1.*
import java.io.ByteArrayInputStream
import java.security.KeyPairGenerator
import java.security.KeyStore
import java.security.cert.X509Certificate

object Execute {
    
    private const val KEYSTORE_ALIAS = "attest_key"
    
    private fun logout(message: String) {
        println("[TSEE]<GetVBHash-Execute>$message")
    }
    
    fun getVerifiedBootHash(): String? {
        return try {
            logout("生成密钥对")
            generateAttestationKey()

            logout("获取证书链")
            val keyStore = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
            val certificates = keyStore.getCertificateChain(KEYSTORE_ALIAS)
            keyStore.deleteEntry(KEYSTORE_ALIAS)
            logout("解析证书链")

            if (certificates.isNullOrEmpty()) {
                logout("证书链为空")
                return null
            }

            val verifiedBootHashBytes = AttestationParser.parseVerifiedBootHash(certificates[0] as X509Certificate)
            val result = verifiedBootHashBytes?.joinToString("") { "%02x".format(it) }
            
            logout("提取目标值")
            if (result != null) {
                logout("提取完毕:$result")
            } else {
                logout("提取失败")
            }
            
            result
        } catch (e: Exception) {
            logout("异常:${e.message}")
            null
        }
    }

    private fun generateAttestationKey() {
        val kpg = KeyPairGenerator.getInstance(
            KeyProperties.KEY_ALGORITHM_EC, "AndroidKeyStore"
        )
        val parameterSpec = KeyGenParameterSpec.Builder(
            KEYSTORE_ALIAS,
            KeyProperties.PURPOSE_SIGN or KeyProperties.PURPOSE_VERIFY
        ).setAttestationChallenge("get-vb-hash".toByteArray())
         .setDigests(KeyProperties.DIGEST_SHA256)
         .build()
        kpg.initialize(parameterSpec)
        kpg.generateKeyPair()
    }

    object AttestationParser {
        private const val ASN1_OID = "1.3.6.1.4.1.11129.2.1.17"
        private const val KM_TAG_ROOT_OF_TRUST = 704
        private const val KEYMASTER_TAG_TYPE_MASK = 0x0FFFFFFF
        
        fun parseVerifiedBootHash(cert: X509Certificate): ByteArray? {
            val extensionValue = cert.getExtensionValue(ASN1_OID) ?: return null

            val asn1InputStream = ASN1InputStream(ByteArrayInputStream(extensionValue))
            val asn1Primitive = asn1InputStream.readObject()

            val octetString = if (asn1Primitive is ASN1OctetString) {
                ASN1InputStream(ByteArrayInputStream(asn1Primitive.octets)).readObject()
            } else {
                asn1Primitive
            }

            if (octetString !is ASN1Sequence) return null

            val teeEnforced = if (octetString.size() > 7) {
                octetString.getObjectAt(7) as? ASN1Sequence
            } else {
                null
            } ?: return null

            val rootOfTrust = findRootOfTrust(teeEnforced) ?: return null

            if (rootOfTrust.size() >= 4) {
                val verifiedBootHashElement = rootOfTrust.getObjectAt(3)
                return extractBytesFromAsn1(verifiedBootHashElement)
            }
            
            return null
        }

        private fun findRootOfTrust(authList: ASN1Sequence): ASN1Sequence? {
            for (i in 0 until authList.size()) {
                val element = authList.getObjectAt(i)
                if (element is ASN1TaggedObject) {
                    val tagNo = element.tagNo
                    if (tagNo == (KM_TAG_ROOT_OF_TRUST and KEYMASTER_TAG_TYPE_MASK)) {
                        return element.baseObject as? ASN1Sequence
                    }
                }
            }
            return null
        }

        private fun extractBytesFromAsn1(asn1Element: ASN1Encodable): ByteArray? {
            return when (asn1Element) {
                is ASN1OctetString -> asn1Element.octets
                is DEROctetString -> asn1Element.octets
                else -> null
            }
        }
    }
}
