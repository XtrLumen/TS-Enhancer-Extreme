tasks.register<Exec>("clean") {
    group = "build"
    executable("cargo")
    args("clean")
    workingDir(projectDir)
}
listOf("Debug", "Release").forEach { variantName ->
    val variantCapped = variantName.replaceFirstChar { if (it.isLowerCase()) it.titlecase() else it.toString() }
    val variantLowered = variantName.lowercase()

    tasks.register<Exec>("buildBins$variantCapped") {
        group = "build"
        executable("cargo")
        args("ndk", "--target", "aarch64-linux-android", "build")
        if (variantLowered == "release") {
            args("--release")
        }
    }
}
tasks.register("buildBins") {
    group = "build"

    dependsOn(
        "buildBinsDebug",
        "buildBinsRelease"
    )
}