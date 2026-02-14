import java.security.Signature
import java.security.KeyFactory
import java.security.MessageDigest
import io.github.rctcwyvrn.blake3.Blake3
import java.security.spec.EdECPrivateKeySpec
import java.security.spec.NamedParameterSpec

buildscript {
    dependencies {
        classpath("io.github.rctcwyvrn:blake3:1.3")
    }
}

plugins {
    id("base")
}

val moduleId: String by rootProject.extra
val moduleName: String by rootProject.extra
val verName: String by rootProject.extra
val verType: String by rootProject.extra
val verCode: Int by rootProject.extra
val verHash: String by rootProject.extra

listOf("debug", "release").forEach { variantName ->
    val variantCapped = variantName.replaceFirstChar { if (it.isLowerCase()) it.titlecase() else it.toString() }
    val variantLowered = variantName.lowercase()
    val moduleDir = layout.buildDirectory.dir("outputs/module/$variantLowered")
    val moduleOutputDir = moduleDir.get().asFile

    val prepareModuleFilesTask = tasks.register<Copy>("prepareModuleFiles$variantCapped") {
        group = "module"

        dependsOn(
            ":app:assemble$variantCapped",
            ":tseed:buildBind$variantCapped",
            ":tsees:buildBins$variantCapped",
            ":tseev:buildLib$variantCapped"
        )
        doFirst {
            with(moduleOutputDir) {
                deleteRecursively()
            }
        }
        into(moduleDir)
            from(project(":app").layout.buildDirectory.file("outputs/apk/$variantLowered")) {
                include(
                    "app-$variantLowered.apk"
                )
                rename(
                    "app-$variantLowered.apk",
                    "service.apk"
                )
            }
            from("$projectDir/src") {
                include(
                    "module.prop"
                )
                expand(
                    "moduleId" to "$moduleId",
                    "moduleName" to "$moduleName",
                    "versionName" to "$verName$verType ($verCode-$verHash-$variantLowered)",
                    "versionCode" to "$verCode"
                )
            }
            from("$projectDir/src") {
                exclude(
                    ".DS_Store",
                    "module.prop"
                )
            }
            from(rootProject.file("README.md")) {
                rename(
                    "README.md",
                    "README4zh-Hans.md"
                )
            }
            from(
                rootProject.files(
                    "README4en-US.md",
                    "README4zh-Hant.md"
                )
            )
        into("bin") {
            from(project(":tseed").file("target/aarch64-linux-android/$variantLowered"))
            include("tseedemo")
            from(project(":tsees").file("target/aarch64-linux-android/$variantLowered"))
            include("tsees")
        }
        into("lib") {
            from(project(":tseev").file("target/aarch64-linux-android/$variantLowered"))
            include("libverify.so")
        }
    }

    val signModuleTask = tasks.register("signModule$variantCapped") {
        group = "module"
        dependsOn(prepareModuleFilesTask)

        doLast {
            fun sha256Sum() {
                fileTree(moduleDir) {
                    exclude("MANIFEST")
                }.visit {
                    if (isDirectory) return@visit

                    val md = MessageDigest.getInstance("SHA3-256")
                    file.forEachBlock(4096) { bytes, size ->
                        md.update(bytes, 0, size)
                    }

                    val sha256File = File(moduleOutputDir, "MANIFEST/${file.relativeTo(moduleOutputDir)}.sha256")
                    sha256File.parentFile.mkdirs()
                    sha256File.writeText(md.digest().joinToString("") { "%02x".format(it) })
                }
            }
            val privateKeyFile = project.file("private_key")
            val misty = File(moduleOutputDir, "mistylake")
            if (privateKeyFile.exists()) {
                val publicKey = project.file("public_key").readBytes()
                val sigType = Signature.getInstance("ed25519")
                val privateKey = privateKeyFile.readBytes()
                fun mistylakeSign() {
                    val set = LinkedHashSet<File>().apply {
                        listOf(
                            "bin/cmd",
                            "bin/tseed",
                            "bin/tsees",
                            "lib/libverify.so",
                            "lib/state.sh",
                            "lib/util_functions.sh",
                            "banner.png",
                            "post-fs-data.sh",
                            "service.apk",
                            "service.sh",
                            "uninstall.sh",
                            "webui.apk",
                            "action.sh"
                        ).forEach { fileName ->
                            add(File(moduleOutputDir, fileName))
                        }
                    }

                    set.forEach {
                        println(it.absolutePath.replace("${moduleOutputDir.absolutePath}/", ""))
                    }

                    val BLAKE3Builder = StringBuilder()

                    set.forEach { file ->
                        val hasher = Blake3.newInstance()
                        val buffer = ByteArray(4096)
                        file.inputStream().use { input ->
                            var bytesRead: Int
                            while (input.read(buffer).also { bytesRead = it } != -1) {
                                if (bytesRead == buffer.size) {
                                    hasher.update(buffer)
                                } else {
                                    hasher.update(buffer.copyOf(bytesRead))
                                }
                            }
                        }
                        val fileHash = hasher.digest()
                        BLAKE3Builder.append(fileHash.joinToString("") { "%02x".format(it) })
                    }

                    val BLAKE3Hash = BLAKE3Builder.toString()

                    println(BLAKE3Hash)

                    sigType.initSign(KeyFactory.getInstance("ed25519").generatePrivate(EdECPrivateKeySpec(NamedParameterSpec("ed25519"), privateKey)))
                    sigType.update(BLAKE3Hash.toByteArray())

                    val signature = sigType.sign()

                    misty.writeBytes(signature.copyOfRange(0, 16))
                    misty.appendBytes(publicKey.copyOfRange(0, 16))
                    misty.appendBytes(signature.copyOfRange(16, 48))
                    misty.appendBytes(publicKey.copyOfRange(16, 32))
                    misty.appendBytes(signature.copyOfRange(48, 64))
                }

                mistylakeSign()

                sha256Sum()

                println("=== Guards the peace of Misty Lake ===")
            } else {
                println("no private_key found, this build will not be signed")

                misty.createNewFile()

                sha256Sum()
            }
        }
    }

    tasks.register<Zip>("zip$variantCapped") {
        group = "module"
        dependsOn(signModuleTask)
        archiveFileName.set("$moduleName-$verName-$verCode-$verHash-$variantName.zip".replace(' ', '-'))
        destinationDirectory.set(layout.buildDirectory.file("outputs/$variantLowered").get().asFile)
        from(moduleDir)
    }
}

tasks.register("zip") {
    group = "module"
    dependsOn(
        "zipDebug",
        "zipRelease"
    )
}