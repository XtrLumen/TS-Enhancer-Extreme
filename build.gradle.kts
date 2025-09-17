import java.io.ByteArrayOutputStream

fun String.execute(currentWorkingDir: File = file("./")): String {
    val process = ProcessBuilder(*split("\\s".toRegex()).toTypedArray())
        .directory(currentWorkingDir)
        .start()
    process.waitFor()
    return process.inputStream.bufferedReader().readText().trim()
}

val moduleId by extra("ts_enhancer_extreme")
val moduleName by extra("TS Enhancer Extreme")
val verName by extra("v0.8.2")
val verType by extra("Beta")
val verCode by extra("git rev-list HEAD --count".execute().toInt() + 81)
val verHash by extra("git rev-parse --verify --short HEAD".execute())