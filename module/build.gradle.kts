import java.util.TreeSet
import java.nio.ByteOrder
import java.nio.ByteBuffer
import java.security.Signature
import java.security.KeyFactory
import java.security.MessageDigest
import java.security.spec.EdECPrivateKeySpec
import java.security.spec.NamedParameterSpec
import org.apache.tools.ant.filters.FixCrLfFilter

plugins {
    base
}

val moduleId: String by rootProject.extra
val moduleName: String by rootProject.extra
val verName: String by rootProject.extra
val verType: String by rootProject.extra
val verCode: Int by rootProject.extra
val verHash: String by rootProject.extra

listOf("debug", "release").forEach { variantName ->
    val variantLowered = variantName.lowercase()
    val variantCapped = variantName.replaceFirstChar { if (it.isLowerCase()) it.titlecase() else it.toString() }

    val moduleDir = layout.buildDirectory.dir("outputs/module/$variantLowered")
    val zipFileName = "$moduleName-$verName-$verCode-$verHash-$variantName.zip".replace(' ', '-')

    val prepareModuleFilesTask = tasks.register<Sync>("prepareModuleFiles$variantCapped") {
        group = "module"
        dependsOn(
            ":app:assemble$variantCapped",
            ":dex:compile$variantCapped"
        )
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
        from(project(":dex").layout.buildDirectory.file("outputs/dex/$variantLowered")) {
            include("service.dex")
        }
        from("$projectDir/src") {
            include(
                "module.prop"
            )
            expand(
                "moduleId" to "$moduleId",
                "moduleName" to "$moduleName",
                "versionName" to "$verName-$verType ($verCode-$verHash-$variantLowered)",
                "versionCode" to "$verCode"
            )
        }
        from("$projectDir/src") {
            include("customize.sh")
            if (variantLowered != "debug") {
                filter { line -> if (line.trim() in listOf("set -x", "set +x")) null else line }
            }
        }
        from("$projectDir/src") {
            exclude(
                "module.prop",
                "customize.sh"
            )
        }
        into("webroot") {
            from("${rootProject.projectDir}/webroot")
        }
    }

    val signModuleTask = tasks.register("signModule$variantCapped") {
        group = "module"
        dependsOn(prepareModuleFilesTask)
        
        val moduleOutputDir = moduleDir.get().asFile
        val privateKeyFile = File(project.projectDir, "private_key")
        val publicKeyFile = File(project.projectDir, "public_key")

        doLast {
            
            fun sha256Files() {
                moduleOutputDir.walkTopDown().forEach { file ->
                    if (file.isDirectory) return@forEach
                    if (file.name.endsWith(".sha256")) return@forEach

                    val md = MessageDigest.getInstance("SHA-256")
                    file.forEachBlock(4096) { bytes, size ->
                        md.update(bytes, 0, size)
                    }

                    File(file.path + ".sha256").writeText(md.digest().joinToString("") { "%02x".format(it) })
                }
            }
            
            if (privateKeyFile.exists()) {
                val privateKey = privateKeyFile.readBytes()
                val publicKey = publicKeyFile.readBytes()
                val namedSpec = NamedParameterSpec("ed25519")
                val privKeySpec = EdECPrivateKeySpec(namedSpec, privateKey)
                val kf = KeyFactory.getInstance("ed25519")
                val privKey = kf.generatePrivate(privKeySpec);
                val sig = Signature.getInstance("ed25519")
                fun File.sha(realFile: File? = null) {
                    sig.update(this.name.toByteArray())
                    sig.update(0)
                    val real = realFile ?: this
                    
                    val buffer = ByteBuffer.allocate(8)
                        .order(ByteOrder.LITTLE_ENDIAN)
                        .putLong(real.length())
                        .array()
                    sig.update(buffer)
                    real.forEachBlock { bytes, size ->
                        sig.update(bytes, 0, size)
                    }
                }

                /* INFO:
                   Mazoku is the file that holds signed hash of all files of TS Enhancer Extreme module, to ensure the zip (runtime and non-runtime) files hasn't been tampered with.
                */
                fun mazokuSign() {
                    sig.initSign(privKey)

                    val filesToProcess = TreeSet<File> { f1, f2 ->
                        f1.path.replace("\\", "/")
                            .compareTo(f2.path.replace("\\", "/"))
                    }

                    moduleOutputDir.walkTopDown().forEach { file ->
                        if (!file.isFile) return@forEach

                        val fileName = file.name
                        if (fileName == "mazoku") return@forEach

                        filesToProcess.add(file)
                    }

                    filesToProcess.forEach { file -> file.sha(file) }

                    val mazokuSignatureFile = File(moduleOutputDir, "mazoku")
                    mazokuSignatureFile.writeBytes(sig.sign())
                    mazokuSignatureFile.appendBytes(publicKey)
                    val md = MessageDigest.getInstance("SHA-256")
                    mazokuSignatureFile.forEachBlock(4096) { bytes, size ->
                        md.update(bytes, 0, size)
                    }
                    File(moduleOutputDir, "mazoku.sha256").writeText(md.digest().joinToString("") { "%02x".format(it) })
                }

                fun machikadoSign(name: String = "machikado") {
                    val set = TreeSet<Pair<File, File?>> { o1, o2 ->
                        o1.first.path.replace("\\", "/")
                            .compareTo(o2.first.path.replace("\\", "/"))
                    }

                    set.add(Pair(File(moduleOutputDir, "post-fs-data.sh"), null))
                    set.add(Pair(File(moduleOutputDir, "uninstall.sh"), null))
                    set.add(Pair(File(moduleOutputDir, "customize.sh"), null))
                    set.add(Pair(File(moduleOutputDir, "service.dex"), null))
                    set.add(Pair(File(moduleOutputDir, "service.apk"), null))
                    set.add(Pair(File(moduleOutputDir, "service.sh"), null))
                    set.add(Pair(File(moduleOutputDir, "banner.png"), null))
                    set.add(Pair(File(moduleOutputDir, "webui.apk"), null))

                    File(moduleOutputDir, "libraries").walkTopDown().forEach { file ->
                        if (file.isFile) {
                            set.add(Pair(file, null))
                        }
                    }
                    File(moduleOutputDir, "binaries").walkTopDown().forEach { file ->
                        if (file.isFile) {
                            set.add(Pair(file, null))
                        }
                    }
                    File(moduleOutputDir, "webroot").walkTopDown().forEach { file ->
                        if (file.isFile) {
                            set.add(Pair(file, null))
                        }
                    }

                    sig.initSign(privKey)
                    set.forEach { it.first.sha(it.second) }
                    val signFile = File(moduleOutputDir, name)
                    signFile.writeBytes(sig.sign())
                    signFile.appendBytes(publicKey)
                }

                /* INFO:
                   Machikado is the name of files that holds signed hash of all runtime files of TS Enhancer Extreme module, to ensure the runtime files hasn't been tampered with.
                */
                println("=== Guards the peace of Machikado ===")

                machikadoSign()

                sha256Files()

                mazokuSign()
            } else {
                println("no private_key found, this build will not be signed")

                File(moduleOutputDir, "machikado").createNewFile()

                sha256Files()

                File(moduleOutputDir, "mazoku").createNewFile()
            }
        }
    }

    tasks.register<Zip>("zip$variantCapped") {
        group = "module"
        dependsOn(signModuleTask)
        archiveFileName.set(zipFileName)
        destinationDirectory.set(layout.buildDirectory.file("outputs/$variantLowered").get().asFile)
        from(moduleDir)
    }
}