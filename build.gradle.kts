val moduleId by extra("ts_enhancer_extreme")
val moduleName by extra("TS Enhancer Extreme")
val verName by extra("v1.0.0")
val verType by extra("")
val verCode by extra(
    providers.exec {
        commandLine("git", "rev-list", "HEAD", "--count")
    }.standardOutput.asText.get().trim().toInt() + 40
)
val verHash by extra(
    providers.exec {
        commandLine("git", "rev-parse", "--verify", "--short", "HEAD")
    }.standardOutput.asText.get().trim()
)