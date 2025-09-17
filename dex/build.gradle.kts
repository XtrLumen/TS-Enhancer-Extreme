plugins {
    base
}

// 使用 Provider API 和配置缓存兼容的方式
abstract class CompileDexTask : DefaultTask() {
    @get:InputDirectory
    abstract val sourceDirectory: DirectoryProperty
    
    @get:OutputDirectory
    abstract val outputDirectory: DirectoryProperty
    
    @get:Internal
    abstract val androidJarPath: Property<String>
    
    @TaskAction
    fun compile() {
        val sourceDir = sourceDirectory.get().asFile
        val buildDir = temporaryDir.resolve("classes")
        val outputDir = outputDirectory.get().asFile
        
        // 创建目录
        buildDir.mkdirs()
        outputDir.mkdirs()
        
        // 查找 Java 源文件
        val javaFiles = sourceDir.walkTopDown()
            .filter { it.isFile && it.extension == "java" }
            .toList()
        
        if (javaFiles.isNotEmpty()) {
            logger.lifecycle("Found ${javaFiles.size} Java files, compiling...")
            
            // 编译 Java 源文件
            val javacCommand = listOf(
                "javac",
                "-d", buildDir.absolutePath,
                "-cp", androidJarPath.get()
            ) + javaFiles.map { it.absolutePath }
            
            val javacProcess = ProcessBuilder(javacCommand).start()
            val javacExitCode = javacProcess.waitFor()
            
            if (javacExitCode != 0) {
                val errorOutput = javacProcess.errorStream.bufferedReader().readText()
                logger.error("Javac error: $errorOutput")
                throw RuntimeException("Java compilation failed")
            }
            
            // 查找编译后的 .class 文件
            val classFiles = buildDir.walkTopDown()
                .filter { it.isFile && it.extension == "class" }
                .toList()
            
            if (classFiles.isNotEmpty()) {
                logger.lifecycle("Found ${classFiles.size} class files, generating service.dex...")
                
                // 使用 d8 生成 DEX 文件
                val d8Command = listOf(
                    "d8",
                    "--output", outputDir.absolutePath
                ) + classFiles.map { it.absolutePath }
                
                val d8Process = ProcessBuilder(d8Command).start()
                val d8ExitCode = d8Process.waitFor()
                
                if (d8ExitCode != 0) {
                    val errorOutput = d8Process.errorStream.bufferedReader().readText()
                    logger.error("d8 error: $errorOutput")
                    throw RuntimeException("DEX compilation failed")
                }
                
                // 重命名输出文件
                val dexFile = outputDir.resolve("classes.dex")
                val serviceDexFile = outputDir.resolve("service.dex")
                
                if (dexFile.exists()) {
                    dexFile.renameTo(serviceDexFile)
                    logger.lifecycle("✅ service.dex generated successfully at: ${serviceDexFile.absolutePath}")
                } else {
                    logger.error("❌ Failed to generate service.dex")
                }
            } else {
                logger.error("❌ No compiled classes found")
            }
        } else {
            logger.error("❌ No Java source files found")
        }
    }
}

val compileDebug = tasks.register<CompileDexTask>("compileDebug") {
    group = "dex"
    description = "Build service.dex from Java sources (Debug variant)"
    
    sourceDirectory.set(layout.projectDirectory.dir("src/main/java"))
    outputDirectory.set(layout.buildDirectory.dir("outputs/dex/debug"))
    androidJarPath.set("/Applications/Android Studio.app/Contents/plugins/android/lib/android.jar")
}

val compileRelease = tasks.register<CompileDexTask>("compileRelease") {
    group = "dex"
    description = "Build service.dex from Java sources (Release variant)"
    
    sourceDirectory.set(layout.projectDirectory.dir("src/main/java"))
    outputDirectory.set(layout.buildDirectory.dir("outputs/dex/release"))
    androidJarPath.set("/Applications/Android Studio.app/Contents/plugins/android/lib/android.jar")
}