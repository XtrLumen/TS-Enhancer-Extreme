tasks.register<Exec>("clean") {
    group = "build"
    executable("cargo")
    args("clean")
    workingDir(projectDir)
}
listOf("Debug", "Release").forEach { variantName ->
    val variantCapped = variantName.replaceFirstChar { if (it.isLowerCase()) it.titlecase() else it.toString() }
    val variantLowered = variantName.lowercase()

    tasks.register<Exec>("buildLib$variantCapped") {
        group = "build"
        executable("cargo")
        args("ndk", "--target", "aarch64-linux-android", "build")
        if (variantLowered == "release") {
            args("--release")
        }
    }
}
tasks.register("buildLib") {
    group = "build"

    dependsOn(
        "buildLibDebug",
        "buildLibRelease"
    )
}