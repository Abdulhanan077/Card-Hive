allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

extra.set("flutter", mapOf(
    "compileSdkVersion" to 36,
    "minSdkVersion" to 24,
    "targetSdkVersion" to 36,
    "ndkVersion" to "27.0.12077973"
))

val newBuildDir: Directory =
    rootProject.layout.buildDirectory
        .dir("../../build")
        .get()
rootProject.layout.buildDirectory.value(newBuildDir)

subprojects {
    val newSubprojectBuildDir: Directory = newBuildDir.dir(project.name)
    project.layout.buildDirectory.value(newSubprojectBuildDir)
}
subprojects {
    project.evaluationDependsOn(":app")
}

subprojects {
    val configureNamespace = {
        if (project.hasProperty("android")) {
            val android = project.extensions.findByName("android")
            if (android != null) {
                try {
                    val getNamespace = android.javaClass.getMethod("getNamespace")
                    val setNamespace = android.javaClass.getMethod("setNamespace", String::class.java)
                    if (getNamespace.invoke(android) == null) {
                        val manifestFile = project.file("src/main/AndroidManifest.xml")
                        var ns: String? = null
                        if (manifestFile.exists()) {
                            val content = manifestFile.readText()
                            val match = Regex("""package="([^"]+)"""").find(content)
                            if (match != null) {
                                ns = match.groupValues[1]
                            }
                        }
                        if (ns == null) {
                            val groupStr = project.group.toString()
                            ns = if (groupStr.isNotEmpty()) groupStr else "com.example.${project.name.replace("-", "_").replace(":", "_")}"
                        }
                        setNamespace.invoke(android, ns)
                    }
                } catch (e: Throwable) {
                    // ignore reflection exceptions
                }
            }
        }
    }

    if (project.state.executed) {
        configureNamespace()
    } else {
        project.afterEvaluate {
            configureNamespace()
        }
    }
}

subprojects {
    if (!project.state.executed) {
        project.afterEvaluate {
            if (project.hasProperty("android")) {
                val android = project.extensions.findByName("android") as? com.android.build.gradle.BaseExtension
                android?.compileSdkVersion(35)
            }
        }
    }
}

tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}
