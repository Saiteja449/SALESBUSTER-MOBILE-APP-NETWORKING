# =============================================================================
# SalesBuster Android - R8 / ProGuard Configuration
# Optimized for Google Play Console DEX Code Optimization & Obfuscation (>=25%)
# =============================================================================

# Preserve source line numbers and file names for crash reporting / Play Vitals
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Preserve annotations, inner classes, interfaces, and signatures for reflection
-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod,JavascriptInterface

# -----------------------------------------------------------------------------
# React Native & Hermes Core Rules
# -----------------------------------------------------------------------------
-keep,allowobfuscation @interface com.facebook.proguard.annotations.DoNotStrip
-keep @com.facebook.proguard.annotations.DoNotStrip class *
-keepclassmembers class * {
    @com.facebook.proguard.annotations.DoNotStrip *;
}

-keep @com.facebook.jni.annotations.DoNotStrip class *
-keepclassmembers class * {
    @com.facebook.jni.annotations.DoNotStrip *;
}

# Preserve native JNI methods
-keepclassmembers,includedescriptorclasses class * {
    native <methods>;
}

# Preserve React methods invoked across the JavaScript-to-Native bridge
-keepclassmembers class * {
    @com.facebook.react.bridge.ReactMethod <methods>;
    @com.facebook.react.uimanager.annotations.ReactProp <methods>;
    @com.facebook.react.uimanager.annotations.ReactPropGroup <methods>;
}

# Preserve React Native package discovery & autolinking constructors
-keep class * implements com.facebook.react.ReactPackage {
    public <init>();
}

-keep,includedescriptorclasses class com.facebook.react.bridge.** { *; }
-keep,includedescriptorclasses class com.facebook.react.turbomodule.core.** { *; }
-keep,includedescriptorclasses class com.facebook.react.internal.turbomodule.core.** { *; }

-dontwarn com.facebook.react.**
-dontwarn com.facebook.jni.**

# Hermes bytecode engine
-keep class com.facebook.hermes.unicode.** { *; }
-keep class com.facebook.jni.** { *; }

# -----------------------------------------------------------------------------
# SalesBuster App Native Classes & Bridge
# Narrow keep rules: keep class entry points without blocking field/method obfuscation
# -----------------------------------------------------------------------------
-keep public class com.salesbusterai.MainApplication {
    public <init>();
    public void onCreate();
}

-keep public class com.salesbusterai.MainActivity {
    public <init>();
}

-keep public class com.salesbusterai.GuestAudioPackage {
    public <init>();
}

-keep public class com.salesbusterai.GeminiVoiceAudioModule {
    public <init>(com.facebook.react.bridge.ReactApplicationContext);
}

-keep public class com.salesbusterai.GuestDeviceModule {
    public <init>(com.facebook.react.bridge.ReactApplicationContext);
}

# AndroidX FileProvider (for sharing voice recordings/photos/WhatsApp docs)
-keep public class androidx.core.content.FileProvider {
    public <init>();
}

# -----------------------------------------------------------------------------
# Third-Party Native Modules
# -----------------------------------------------------------------------------
# React Native Screens
-keep class com.swmansion.rnscreens.** { *; }

# React Native Safe Area Context
-keep class com.th3rdwave.safeareacontext.** { *; }

# React Native SVG
-keep public class com.horcrux.svg.** { *; }

# React Native Documents Picker
-keep class com.reactnativedocumentpicker.** { *; }

# React Native Async Storage
-keep class com.reactnativecommunity.asyncstorage.** { *; }

# React Native Video & AndroidX Media3 / ExoPlayer
-keep class androidx.media3.common.** { *; }
-keep class androidx.media3.exoplayer.** { *; }
-keep class androidx.media3.extractor.** { *; }
-keep class androidx.media3.datasource.** { *; }
-dontwarn androidx.media3.**
-keep class com.brentvatne.react.** { *; }
-keep class com.brentvatne.exoplayer.** { *; }

# -----------------------------------------------------------------------------
# Networking (OkHttp / Okio)
# -----------------------------------------------------------------------------
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn javax.annotation.**
-keepnames class okhttp3.internal.publicsuffix.PublicSuffixDatabase
