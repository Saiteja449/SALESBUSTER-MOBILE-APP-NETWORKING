package com.salesbusterai

import android.Manifest
import android.accounts.AccountManager
import android.app.Activity
import android.content.ClipData
import android.content.ClipDescription
import android.content.ClipboardManager
import android.content.ContentProviderOperation
import android.content.ContentResolver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.database.ContentObserver
import android.graphics.BitmapFactory
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.HandlerThread
import android.provider.ContactsContract
import android.provider.MediaStore
import android.util.Base64
import android.util.Log
import android.webkit.MimeTypeMap
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableType
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicReference

class GuestDeviceModule(private val context: ReactApplicationContext) :
    ReactContextBaseJavaModule(context), ActivityEventListener {

    private var pendingPromise: Promise? = null
    private var pendingFile: File? = null
    private var pendingMimeType = "image/jpeg"

    init {
        context.addActivityEventListener(this)
    }

    override fun getName(): String = "DefaultDialer"

    @ReactMethod
    fun captureCardPhoto(promise: Promise) = launchCamera(false, promise)

    @ReactMethod
    fun captureSelfiePhoto(promise: Promise) = launchCamera(true, promise)

    @ReactMethod
    fun saveAuthToken(token: String?, promise: Promise) = promise.resolve(true)

    @ReactMethod
    fun saveUserPhoneNumber(phone: String?, promise: Promise) = promise.resolve(true)

    private fun launchCamera(frontCamera: Boolean, promise: Promise) {
        val activity = context.currentActivity
        if (activity == null) {
            promise.reject("ACTIVITY_NULL", "Current Activity is unavailable.")
            return
        }
        if (pendingPromise != null) {
            promise.reject("CAMERA_BUSY", "A camera capture is already in progress.")
            return
        }

        try {
            val directory = File(activity.cacheDir, "card_scans").apply { mkdirs() }
            val prefix = if (frontCamera) "selfie" else "card"
            val photo = File(directory, "${prefix}_${System.currentTimeMillis()}.jpg")
            val uri = FileProvider.getUriForFile(
                activity,
                "${activity.packageName}.guestprovider",
                photo,
            )
            val intent = Intent(MediaStore.ACTION_IMAGE_CAPTURE).apply {
                putExtra(MediaStore.EXTRA_OUTPUT, uri)
                if (frontCamera) {
                    putExtra("android.intent.extra.USE_FRONT_CAMERA", true)
                    putExtra("android.intent.extras.CAMERA_FACING", 1)
                    putExtra("android.intent.extra.CAMERA_FACING", 1)
                    putExtra("android.intent.extras.LENS_FACING_FRONT", 1)
                    putExtra("android.intent.extra.LENS_FACING_FRONT", 1)
                    putExtra("camerafacing", "front")
                    putExtra("previous_mode", "front")
                    putExtra("org.codeaurora.extra.canon.reverse.lenses", true)
                    putExtra("com.google.assistant.extra.USE_FRONT_CAMERA", true)
                } else {
                    putExtra("android.intent.extra.USE_FRONT_CAMERA", false)
                    putExtra("android.intent.extras.CAMERA_FACING", 0)
                    putExtra("android.intent.extra.CAMERA_FACING", 0)
                    putExtra("android.intent.extras.LENS_FACING_FRONT", 0)
                    putExtra("android.intent.extra.LENS_FACING_FRONT", 0)
                    putExtra("camerafacing", "back")
                    putExtra("previous_mode", "back")
                    putExtra("org.codeaurora.extra.canon.reverse.lenses", false)
                    putExtra("com.google.assistant.extra.USE_FRONT_CAMERA", false)
                }
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION)
                clipData = android.content.ClipData.newRawUri("Guest capture", uri)
            }
            if (intent.resolveActivity(activity.packageManager) == null) {
                promise.reject("CAMERA_UNAVAILABLE", "No camera app is available on this device.")
                return
            }

            pendingPromise = promise
            pendingFile = photo
            pendingMimeType = "image/jpeg"
            activity.startActivityForResult(intent, CAMERA_REQUEST_CODE)
        } catch (error: Exception) {
            pendingPromise = null
            pendingFile?.delete()
            pendingFile = null
            promise.reject("CAMERA_ERROR", error.message ?: "Failed to launch the camera.", error)
        }
    }

    override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode != CAMERA_REQUEST_CODE) return
        val promise = pendingPromise ?: return
        val photo = pendingFile
        pendingPromise = null
        pendingFile = null

        if (resultCode != Activity.RESULT_OK || photo == null || !photo.exists() || photo.length() == 0L) {
            photo?.delete()
            promise.resolve(null)
            return
        }

        try {
            val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
            BitmapFactory.decodeFile(photo.absolutePath, bounds)
            var sampleSize = 1
            while (bounds.outWidth / sampleSize > 1600 || bounds.outHeight / sampleSize > 1600) {
                sampleSize *= 2
            }
            val bitmap = BitmapFactory.decodeFile(
                photo.absolutePath,
                BitmapFactory.Options().apply { inSampleSize = sampleSize },
            ) ?: throw IllegalStateException("Could not decode the captured image.")

            val output = ByteArrayOutputStream()
            bitmap.compress(android.graphics.Bitmap.CompressFormat.JPEG, 85, output)
            val base64 = Base64.encodeToString(output.toByteArray(), Base64.NO_WRAP)
            val width = bitmap.width
            val height = bitmap.height
            bitmap.recycle()

            val result = Arguments.createMap().apply {
                putString("base64", base64)
                putString("mimeType", pendingMimeType)
                putString("uri", Uri.fromFile(photo).toString())
                putInt("width", width)
                putInt("height", height)
            }
            promise.resolve(result)
        } catch (error: Exception) {
            promise.reject("CAMERA_READ_ERROR", error.message ?: "Could not read the captured image.", error)
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // WHATSAPP DIRECT MEDIA + TEXT SHARING IMPLEMENTATION
    // ─────────────────────────────────────────────────────────────────────────────

    @ReactMethod
    fun shareToWhatsAppWithFiles(
        phone: String,
        messageText: String?,
        files: ReadableArray,
        promise: Promise
    ) {
        val ctx: Context = context.currentActivity ?: context
        Thread {
            try {
                val waPackage = resolveWhatsAppPackage(ctx)
                if (waPackage == null) {
                    promise.reject(
                        "WHATSAPP_NOT_INSTALLED",
                        "Neither WhatsApp nor WhatsApp Business is installed on this device."
                    )
                    return@Thread
                }

                val intlPhone = normalizeIntlPhone(phone)
                val (singlePrepared, errorSummary) = prepareSingleImageAttachment(ctx, files)
                if (singlePrepared == null) {
                    val reason = errorSummary ?: "No valid image could be prepared for sharing."
                    Log.e(TAG, "Attachment preparation errors: $reason")
                    promise.reject("ATTACHMENT_PREPARATION_FAILED", "Failed to prepare image attachment: $reason")
                    return@Thread
                }

                val targetPackage = findSyncedWhatsAppPackage(ctx, intlPhone) ?: waPackage
                val (singleUri, singleMime) = singlePrepared
                launchWhatsAppSendIntent(ctx, targetPackage, intlPhone, singleUri, singleMime, messageText)
                promise.resolve(true)
            } catch (e: Exception) {
                Log.e(TAG, "Failed to share files to WhatsApp", e)
                promise.reject("SHARE_ERROR", e.message ?: "Failed to share files to WhatsApp")
            }
        }.start()
    }

    @ReactMethod
    fun shareToWhatsAppSmart(
        phone: String,
        name: String?,
        companyName: String?,
        eventName: String?,
        messageText: String?,
        files: ReadableArray,
        syncTimeoutMs: Int,
        promise: Promise
    ) {
        val ctx: Context = context.currentActivity ?: context
        Thread {
            try {
                val installedWa = resolveWhatsAppPackage(ctx)
                if (installedWa == null) {
                    promise.reject(
                        "WHATSAPP_NOT_INSTALLED",
                        "Neither WhatsApp nor WhatsApp Business is installed on this device."
                    )
                    return@Thread
                }

                val intlPhone = normalizeIntlPhone(phone)
                val (singlePrepared, errorSummary) = prepareSingleImageAttachment(ctx, files)
                if (singlePrepared == null) {
                    val reason = errorSummary ?: "No valid image could be prepared for sharing."
                    promise.reject("ATTACHMENT_PREPARATION_FAILED", "Failed to prepare image attachment: $reason")
                    return@Thread
                }

                val (singleUri, singleMime) = singlePrepared
                val hasReadContacts = ContextCompat.checkSelfPermission(
                    ctx,
                    Manifest.permission.READ_CONTACTS
                ) == PackageManager.PERMISSION_GRANTED
                val hasWriteContacts = ContextCompat.checkSelfPermission(
                    ctx,
                    Manifest.permission.WRITE_CONTACTS
                ) == PackageManager.PERMISSION_GRANTED

                var contactSavedOrExisting = false
                var syncedPackage = if (hasReadContacts) findSyncedWhatsAppPackage(ctx, intlPhone) else null

                if (syncedPackage != null) {
                    contactSavedOrExisting = true
                } else if (hasReadContacts && hasWriteContacts) {
                    val alreadySaved = isPhoneSavedInContacts(ctx, intlPhone)
                    contactSavedOrExisting = if (alreadySaved) {
                        true
                    } else {
                        insertLocalContact(ctx, intlPhone, name, companyName, eventName)
                    }
                    val waitMs = if (syncTimeoutMs > 0) syncTimeoutMs.toLong() else 4000L
                    syncedPackage = waitForWhatsAppProfileSync(ctx, intlPhone, waitMs)
                }

                // If WhatsApp has synced the contact row, target that package directly with jid.
                // If not yet synced, STILL launch WhatsApp ACTION_SEND so the attendee selfie is NEVER DROPPED!
                val targetPkg = syncedPackage ?: installedWa
                launchWhatsAppSendIntent(ctx, targetPkg, intlPhone, singleUri, singleMime, messageText)

                val result = Arguments.createMap().apply {
                    putBoolean("launched", true)
                    putString("mode", "action_send_media")
                    putBoolean("synced", syncedPackage != null)
                    putBoolean("contactSaved", contactSavedOrExisting)
                    putString("package", targetPkg)
                    putBoolean("imageCopiedToClipboard", false)
                }
                promise.resolve(result)
            } catch (e: Exception) {
                Log.e(TAG, "Failed in shareToWhatsAppSmart", e)
                promise.reject("SHARE_ERROR", e.message ?: "Failed to share image to WhatsApp")
            }
        }.start()
    }

    private fun resolveWhatsAppPackage(ctx: Context): String? {
        val packages = listOf("com.whatsapp", "com.whatsapp.w4b")
        for (pkg in packages) {
            if (isPackageInstalled(ctx, pkg)) return pkg
        }
        return null
    }

    private fun isPackageInstalled(ctx: Context, packageName: String): Boolean {
        return try {
            ctx.packageManager.getPackageInfo(packageName, 0)
            true
        } catch (_: Exception) {
            false
        }
    }

    private fun normalizeIntlPhone(phone: String): String {
        val cleanDigits = phone.replace(Regex("\\D"), "")
        return if (cleanDigits.length == 10) "91$cleanDigits" else cleanDigits
    }

    private fun prepareSingleImageAttachment(
        ctx: Context,
        files: ReadableArray
    ): Pair<Pair<Uri, String>?, String?> {
        val shareDir = File(ctx.cacheDir, "whatsapp_share").apply { mkdirs() }
        pruneOldSharedFiles(shareDir)

        val usedFilePaths = mutableSetOf<String>()
        val preparedList = mutableListOf<Pair<Uri, String>>()
        val failedList = mutableListOf<String>()

        for (i in 0 until files.size()) {
            var rawUri: String? = null
            var rawName: String? = null
            var customType: String? = null

            when (files.getType(i)) {
                ReadableType.String -> {
                    rawUri = files.getString(i)
                }
                ReadableType.Map -> {
                    val map = files.getMap(i)
                    rawUri = when {
                        map?.hasKey("uri") == true && !map.isNull("uri") -> map.getString("uri")
                        map?.hasKey("url") == true && !map.isNull("url") -> map.getString("url")
                        map?.hasKey("fileUrl") == true && !map.isNull("fileUrl") -> map.getString("fileUrl")
                        map?.hasKey("path") == true && !map.isNull("path") -> map.getString("path")
                        else -> null
                    }
                    rawName = when {
                        map?.hasKey("name") == true && !map.isNull("name") -> map.getString("name")
                        map?.hasKey("fileName") == true && !map.isNull("fileName") -> map.getString("fileName")
                        map?.hasKey("originalName") == true && !map.isNull("originalName") -> map.getString("originalName")
                        map?.hasKey("filename") == true && !map.isNull("filename") -> map.getString("filename")
                        else -> null
                    }
                    customType = when {
                        map?.hasKey("type") == true && !map.isNull("type") -> map.getString("type")
                        map?.hasKey("mimeType") == true && !map.isNull("mimeType") -> map.getString("mimeType")
                        map?.hasKey("contentType") == true && !map.isNull("contentType") -> map.getString("contentType")
                        else -> null
                    }
                }
                else -> {}
            }

            if (rawUri.isNullOrBlank()) {
                failedList.add("item_$i (empty URI)")
                continue
            }

            when (val result = prepareSharedFile(ctx, rawUri, rawName, customType, usedFilePaths)) {
                is PreparationResult.Success -> {
                    preparedList.add(Pair(result.uri, result.mimeType))
                    Log.d(TAG, "Prepared attachment [$i]: name='${result.fileName}', mime='${result.mimeType}'")
                }
                is PreparationResult.Failure -> {
                    Log.e(TAG, "Failed preparing attachment [$i]: ${result.reason}")
                    failedList.add("${result.fileName} (${result.reason})")
                }
            }
        }

        val singlePrepared = preparedList.firstOrNull { it.second.startsWith("image/") }
            ?: preparedList.firstOrNull()

        val errorSummary = if (failedList.isNotEmpty()) failedList.joinToString("; ") else null
        return Pair(singlePrepared, errorSummary)
    }

    private fun prepareSharedFile(
        ctx: Context,
        rawUriOrUrl: String,
        rawName: String?,
        customType: String?,
        usedFilePaths: MutableSet<String>
    ): PreparationResult {
        return try {
            val shareDir = File(ctx.cacheDir, "whatsapp_share").apply { mkdirs() }

            var candidateName = rawName?.trim()
            if (candidateName.isNullOrBlank()) {
                val pathPart = rawUriOrUrl.substringBefore('?').substringBefore('#')
                candidateName = pathPart.substringAfterLast('/').substringAfterLast('\\')
            }
            if (candidateName.isNullOrBlank()) {
                candidateName = "selfie_${System.currentTimeMillis()}.jpg"
            }
            candidateName = candidateName.substringBefore('?').substringBefore('#').trim()

            val dotIndex = candidateName.lastIndexOf('.')
            var nameExt: String? = null
            var baseName = candidateName
            if (dotIndex > 0 && dotIndex < candidateName.length - 1) {
                val candidateExt = candidateName.substring(dotIndex + 1).lowercase()
                if (candidateExt.length in 1..10 && candidateExt.all { it.isLetterOrDigit() }) {
                    nameExt = candidateExt
                    baseName = candidateName.substring(0, dotIndex)
                }
            }

            val cleanUrlPath = rawUriOrUrl.substringBefore('?').substringBefore('#')
            val urlDotIndex = cleanUrlPath.lastIndexOf('.')
            var urlExt: String? = null
            if (urlDotIndex > 0 && urlDotIndex < cleanUrlPath.length - 1) {
                val candidateExt = cleanUrlPath.substring(urlDotIndex + 1).lowercase()
                if (candidateExt.length in 1..10 && candidateExt.all { it.isLetterOrDigit() }) {
                    urlExt = candidateExt
                }
            }

            val detectedExt = nameExt ?: urlExt ?: "jpg"
            val sanitizedBase = baseName.replace(Regex("[^a-zA-Z0-9._-]"), "_").takeIf { it.isNotBlank() } ?: "selfie"
            var tentativeFileName = "$sanitizedBase.$detectedExt"
            var targetFile = File(shareDir, tentativeFileName)
            var collisionIndex = 1
            while (usedFilePaths.contains(targetFile.absolutePath)) {
                tentativeFileName = "${sanitizedBase}_$collisionIndex.$detectedExt"
                targetFile = File(shareDir, tentativeFileName)
                collisionIndex++
            }

            val isHttp = rawUriOrUrl.startsWith("http://") || rawUriOrUrl.startsWith("https://")
            val dlResult = if (isHttp) {
                downloadHttpFile(rawUriOrUrl, targetFile, candidateName)
            } else {
                copyLocalUriOrFile(ctx, rawUriOrUrl, targetFile, candidateName)
            }

            val httpContentType = when (dlResult) {
                is DownloadResult.Success -> dlResult.contentType
                is DownloadResult.Failure -> return PreparationResult.Failure(candidateName, dlResult.reason)
            }

            val cleanedCustomType = customType?.trim()?.takeIf {
                it.isNotBlank() && it != "application/octet-stream" && it != "*/*"
            }
            val cleanedHttpType = httpContentType?.substringBefore(';')?.trim()?.takeIf {
                it.isNotBlank() && it != "application/octet-stream" && it != "*/*" && !it.startsWith("text/html")
            }

            val resolvedMimeType = when {
                cleanedCustomType != null -> cleanedCustomType
                cleanedHttpType != null -> cleanedHttpType
                detectedExt == "jpg" || detectedExt == "jpeg" -> "image/jpeg"
                detectedExt == "png" -> "image/png"
                detectedExt == "webp" -> "image/webp"
                else -> MimeTypeMap.getSingleton().getMimeTypeFromExtension(detectedExt) ?: "image/jpeg"
            }

            usedFilePaths.add(targetFile.absolutePath)

            val contentUri = FileProvider.getUriForFile(
                ctx,
                "${ctx.packageName}.guestprovider",
                targetFile
            )

            PreparationResult.Success(contentUri, resolvedMimeType, targetFile.name)
        } catch (e: Exception) {
            Log.e(TAG, "Unexpected error preparing shared file for $rawUriOrUrl", e)
            PreparationResult.Failure(rawName ?: rawUriOrUrl, e.message ?: "Unknown preparation error")
        }
    }

    private fun copyLocalUriOrFile(
        ctx: Context,
        rawUriOrUrl: String,
        targetFile: File,
        expectedName: String
    ): DownloadResult {
        val tempFile = File(targetFile.parentFile, "${targetFile.name}.download_${System.currentTimeMillis()}")
        var resolvedType: String? = null
        try {
            val parsedUri = Uri.parse(rawUriOrUrl)
            if (parsedUri.scheme == "content") {
                try {
                    ctx.contentResolver.takePersistableUriPermission(parsedUri, Intent.FLAG_GRANT_READ_URI_PERMISSION)
                } catch (_: Exception) {}
                resolvedType = try { ctx.contentResolver.getType(parsedUri) } catch (_: Exception) { null }
                var streamCopied = false
                try {
                    ctx.contentResolver.openInputStream(parsedUri)?.use { input ->
                        FileOutputStream(tempFile).use { output ->
                            input.copyTo(output)
                        }
                        streamCopied = true
                    }
                } catch (_: Exception) {
                    streamCopied = false
                }
                if (!streamCopied || !tempFile.exists() || tempFile.length() == 0L) {
                    ctx.contentResolver.openFileDescriptor(parsedUri, "r")?.use { pfd ->
                        java.io.FileInputStream(pfd.fileDescriptor).use { input ->
                            FileOutputStream(tempFile).use { output ->
                                input.copyTo(output)
                            }
                        }
                    } ?: return DownloadResult.Failure("Cannot open content stream or descriptor for '$expectedName'")
                }
            } else if (parsedUri.scheme == "file" || rawUriOrUrl.startsWith("/")) {
                val srcPath = if (parsedUri.scheme == "file") (parsedUri.path ?: rawUriOrUrl) else rawUriOrUrl
                val srcFile = File(srcPath)
                if (!srcFile.exists()) {
                    return DownloadResult.Failure("Local file does not exist: '$srcPath'")
                }
                srcFile.inputStream().use { input ->
                    FileOutputStream(tempFile).use { output ->
                        input.copyTo(output)
                    }
                }
            } else if (rawUriOrUrl.startsWith("data:") && rawUriOrUrl.contains(";base64,")) {
                val base64Data = rawUriOrUrl.substringAfter(";base64,")
                val decoded = Base64.decode(base64Data, Base64.DEFAULT)
                FileOutputStream(tempFile).use { output ->
                    output.write(decoded)
                }
                resolvedType = rawUriOrUrl.substringAfter("data:").substringBefore(";base64")
            } else {
                return DownloadResult.Failure("Unsupported URI scheme for '$rawUriOrUrl'")
            }

            if (!tempFile.exists() || tempFile.length() == 0L) {
                tempFile.delete()
                return DownloadResult.Failure("Local file '$expectedName' is empty (0 bytes)")
            }
            if (targetFile.exists()) {
                targetFile.delete()
            }
            if (!tempFile.renameTo(targetFile)) {
                tempFile.copyTo(targetFile, overwrite = true)
                tempFile.delete()
            }
            return DownloadResult.Success(resolvedType)
        } catch (e: Exception) {
            if (tempFile.exists()) tempFile.delete()
            return DownloadResult.Failure("Error reading local file '$expectedName': ${e.message}")
        }
    }

    private fun downloadHttpFile(
        urlString: String,
        targetFile: File,
        expectedName: String
    ): DownloadResult {
        val tempFile = File(targetFile.parentFile, "${targetFile.name}.download_${System.currentTimeMillis()}")
        var connection: HttpURLConnection? = null
        try {
            val url = URL(urlString)
            connection = (url.openConnection() as HttpURLConnection).apply {
                connectTimeout = 15000
                readTimeout = 30000
                instanceFollowRedirects = true
                setRequestProperty("User-Agent", "SalesBusterMobile/1.0")
            }
            connection.connect()

            val responseCode = connection.responseCode
            if (responseCode !in 200..299) {
                return DownloadResult.Failure("HTTP $responseCode while downloading '$expectedName'")
            }

            val contentType = connection.contentType
            connection.inputStream.use { input ->
                FileOutputStream(tempFile).use { output ->
                    input.copyTo(output)
                }
            }

            if (!tempFile.exists() || tempFile.length() == 0L) {
                tempFile.delete()
                return DownloadResult.Failure("Downloaded file '$expectedName' is empty (0 bytes)")
            }

            if (targetFile.exists()) targetFile.delete()
            if (!tempFile.renameTo(targetFile)) {
                tempFile.copyTo(targetFile, overwrite = true)
                tempFile.delete()
            }
            return DownloadResult.Success(contentType)
        } catch (e: Exception) {
            if (tempFile.exists()) tempFile.delete()
            return DownloadResult.Failure("Network error downloading '$expectedName': ${e.message}")
        } finally {
            connection?.disconnect()
        }
    }

    private fun launchWhatsAppSendIntent(
        ctx: Context,
        waPackage: String,
        intlPhone: String,
        singleUri: Uri,
        singleMime: String,
        messageText: String?
    ) {
        val intent = Intent(Intent.ACTION_SEND).apply {
            type = singleMime
            putExtra(Intent.EXTRA_STREAM, singleUri)
            if (!messageText.isNullOrBlank()) {
                putExtra(Intent.EXTRA_TEXT, messageText)
            }
        }

        val clipDescription = ClipDescription("Image Attachment", arrayOf(singleMime))
        val clipData = ClipData(clipDescription, ClipData.Item(singleUri))
        intent.clipData = clipData

        try {
            ctx.grantUriPermission(waPackage, singleUri, Intent.FLAG_GRANT_READ_URI_PERMISSION)
        } catch (e: Exception) {
            Log.w(TAG, "Could not grant URI permission to $waPackage for $singleUri", e)
        }

        if (!messageText.isNullOrBlank()) {
            try {
                val clipboard = ctx.getSystemService(Context.CLIPBOARD_SERVICE) as? ClipboardManager
                val clip = ClipData.newPlainText("Event Message", messageText)
                clipboard?.setPrimaryClip(clip)
            } catch (e: Exception) {
                Log.w(TAG, "Could not copy message text to clipboard", e)
            }
        }

        intent.setPackage(waPackage)
        intent.putExtra("jid", "$intlPhone@s.whatsapp.net")
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)

        val act = context.currentActivity
        if (act != null) {
            act.runOnUiThread {
                try {
                    act.startActivity(shareIntentWithFallback(act, intent))
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to launch sharing activity", e)
                }
            }
        } else {
            ctx.startActivity(shareIntentWithFallback(ctx, intent))
        }
    }

    private fun shareIntentWithFallback(ctx: Context, shareIntent: Intent): Intent {
        return try {
            if (shareIntent.resolveActivity(ctx.packageManager) != null) {
                shareIntent
            } else {
                Intent.createChooser(shareIntent, "Share via").apply {
                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
            }
        } catch (_: Exception) {
            shareIntent
        }
    }

    private fun pruneOldSharedFiles(shareDir: File) {
        try {
            val maxAge = System.currentTimeMillis() - 24 * 60 * 60 * 1000L
            shareDir.listFiles()?.forEach { f ->
                if (f.isFile && f.lastModified() < maxAge) {
                    f.delete()
                }
            }
        } catch (_: Exception) {}
    }

    private fun findSyncedWhatsAppPackage(ctx: Context, intlPhone: String): String? {
        if (ContextCompat.checkSelfPermission(ctx, Manifest.permission.READ_CONTACTS) != PackageManager.PERMISSION_GRANTED) {
            return null
        }
        val jid = "$intlPhone@s.whatsapp.net"
        val waMime = "vnd.android.cursor.item/vnd.com.whatsapp.profile"
        val waBizMime = "vnd.android.cursor.item/vnd.com.whatsapp.w4b.profile"
        var foundStandard = false
        var foundBusiness = false
        try {
            val projection = arrayOf(ContactsContract.Data.MIMETYPE)
            val selection = "${ContactsContract.Data.DATA1} = ? AND ${ContactsContract.Data.MIMETYPE} IN (?, ?)"
            val selectionArgs = arrayOf(jid, waMime, waBizMime)
            ctx.contentResolver.query(
                ContactsContract.Data.CONTENT_URI,
                projection,
                selection,
                selectionArgs,
                null
            )?.use { cursor ->
                val mimeIdx = cursor.getColumnIndex(ContactsContract.Data.MIMETYPE)
                while (cursor.moveToNext()) {
                    val mime = if (mimeIdx >= 0) cursor.getString(mimeIdx) else null
                    if (mime == waMime) foundStandard = true
                    else if (mime == waBizMime) foundBusiness = true
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "Failed querying WhatsApp profile rows: ${e.message}")
        }

        if (foundStandard && isPackageInstalled(ctx, "com.whatsapp")) return "com.whatsapp"
        if (foundBusiness && isPackageInstalled(ctx, "com.whatsapp.w4b")) return "com.whatsapp.w4b"
        return null
    }

    private fun isPhoneSavedInContacts(ctx: Context, intlPhone: String): Boolean {
        if (ContextCompat.checkSelfPermission(ctx, Manifest.permission.READ_CONTACTS) != PackageManager.PERMISSION_GRANTED) {
            return false
        }
        val candidates = linkedSetOf("+$intlPhone", intlPhone)
        if (intlPhone.length > 10) {
            candidates.add(intlPhone.takeLast(10))
        }
        for (candidate in candidates) {
            try {
                val lookupUri = Uri.withAppendedPath(
                    ContactsContract.PhoneLookup.CONTENT_FILTER_URI,
                    Uri.encode(candidate)
                )
                ctx.contentResolver.query(
                    lookupUri,
                    arrayOf(ContactsContract.PhoneLookup._ID),
                    null,
                    null,
                    null
                )?.use { cursor ->
                    if (cursor.moveToFirst()) return true
                }
            } catch (e: Exception) {
                Log.w(TAG, "PhoneLookup check failed for $candidate: ${e.message}")
            }
        }
        return false
    }

    private fun insertLocalContact(
        ctx: Context,
        intlPhone: String,
        displayName: String?,
        companyName: String?,
        eventName: String?
    ): Boolean {
        if (ContextCompat.checkSelfPermission(ctx, Manifest.permission.WRITE_CONTACTS) != PackageManager.PERMISSION_GRANTED) {
            return false
        }
        val cleanName = displayName?.trim()?.takeIf { it.isNotEmpty() } ?: "Event Visitor"
        val cleanCompany = companyName?.trim()?.takeIf { it.isNotEmpty() }
        val cleanEvent = eventName?.trim()?.takeIf { it.isNotEmpty() }
        val noteText = if (cleanEvent != null) {
            "Captured at $cleanEvent via SalesBuster"
        } else {
            "Captured via SalesBuster"
        }

        return try {
            val ops = ArrayList<ContentProviderOperation>()
            ops.add(
                ContentProviderOperation.newInsert(ContactsContract.RawContacts.CONTENT_URI)
                    .withValue(ContactsContract.RawContacts.ACCOUNT_TYPE, null)
                    .withValue(ContactsContract.RawContacts.ACCOUNT_NAME, null)
                    .build()
            )
            ops.add(
                ContentProviderOperation.newInsert(ContactsContract.Data.CONTENT_URI)
                    .withValueBackReference(ContactsContract.Data.RAW_CONTACT_ID, 0)
                    .withValue(
                        ContactsContract.Data.MIMETYPE,
                        ContactsContract.CommonDataKinds.StructuredName.CONTENT_ITEM_TYPE
                    )
                    .withValue(ContactsContract.CommonDataKinds.StructuredName.DISPLAY_NAME, cleanName)
                    .build()
            )
            ops.add(
                ContentProviderOperation.newInsert(ContactsContract.Data.CONTENT_URI)
                    .withValueBackReference(ContactsContract.Data.RAW_CONTACT_ID, 0)
                    .withValue(
                        ContactsContract.Data.MIMETYPE,
                        ContactsContract.CommonDataKinds.Phone.CONTENT_ITEM_TYPE
                    )
                    .withValue(ContactsContract.CommonDataKinds.Phone.NUMBER, "+$intlPhone")
                    .withValue(
                        ContactsContract.CommonDataKinds.Phone.TYPE,
                        ContactsContract.CommonDataKinds.Phone.TYPE_MOBILE
                    )
                    .build()
            )
            if (cleanCompany != null) {
                ops.add(
                    ContentProviderOperation.newInsert(ContactsContract.Data.CONTENT_URI)
                        .withValueBackReference(ContactsContract.Data.RAW_CONTACT_ID, 0)
                        .withValue(
                            ContactsContract.Data.MIMETYPE,
                            ContactsContract.CommonDataKinds.Organization.CONTENT_ITEM_TYPE
                        )
                        .withValue(ContactsContract.CommonDataKinds.Organization.COMPANY, cleanCompany)
                        .withValue(
                            ContactsContract.CommonDataKinds.Organization.TYPE,
                            ContactsContract.CommonDataKinds.Organization.TYPE_WORK
                        )
                        .build()
                )
            }
            ops.add(
                ContentProviderOperation.newInsert(ContactsContract.Data.CONTENT_URI)
                    .withValueBackReference(ContactsContract.Data.RAW_CONTACT_ID, 0)
                    .withValue(
                        ContactsContract.Data.MIMETYPE,
                        ContactsContract.CommonDataKinds.Note.CONTENT_ITEM_TYPE
                    )
                    .withValue(ContactsContract.CommonDataKinds.Note.NOTE, noteText)
                    .build()
            )
            val results = ctx.contentResolver.applyBatch(ContactsContract.AUTHORITY, ops)
            results.isNotEmpty()
        } catch (e: Exception) {
            Log.e(TAG, "Failed inserting local contact: ${e.message}")
            false
        }
    }

    private fun nudgeWhatsAppSync(ctx: Context) {
        val extras = Bundle().apply {
            putBoolean(ContentResolver.SYNC_EXTRAS_MANUAL, true)
            putBoolean(ContentResolver.SYNC_EXTRAS_EXPEDITED, true)
        }
        val accountTypes = listOf("com.whatsapp", "com.whatsapp.w4b")
        try {
            val accountManager = AccountManager.get(ctx)
            for (type in accountTypes) {
                try {
                    val accounts = accountManager.getAccountsByType(type)
                    for (account in accounts) {
                        ContentResolver.requestSync(account, ContactsContract.AUTHORITY, extras)
                    }
                } catch (_: SecurityException) {
                } catch (e: Exception) {
                    Log.w(TAG, "Sync request failed for $type: ${e.message}")
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "Could not access AccountManager for sync nudge: ${e.message}")
        }
    }

    private fun waitForWhatsAppProfileSync(
        ctx: Context,
        intlPhone: String,
        timeoutMs: Long
    ): String? {
        findSyncedWhatsAppPackage(ctx, intlPhone)?.let { return it }
        if (timeoutMs <= 0L) return null

        val latch = CountDownLatch(1)
        val resolvedPackage = AtomicReference<String?>(null)
        val handlerThread = HandlerThread("WaSyncObserver").apply { start() }
        val handler = Handler(handlerThread.looper)
        val observer = object : ContentObserver(handler) {
            override fun onChange(selfChange: Boolean) {
                val pkg = findSyncedWhatsAppPackage(ctx, intlPhone)
                if (pkg != null) {
                    resolvedPackage.compareAndSet(null, pkg)
                    latch.countDown()
                }
            }
        }

        try {
            ctx.contentResolver.registerContentObserver(
                ContactsContract.Data.CONTENT_URI,
                true,
                observer
            )
            nudgeWhatsAppSync(ctx)

            val deadline = System.currentTimeMillis() + timeoutMs
            while (System.currentTimeMillis() < deadline && resolvedPackage.get() == null) {
                val pkg = findSyncedWhatsAppPackage(ctx, intlPhone)
                if (pkg != null) {
                    resolvedPackage.compareAndSet(null, pkg)
                    break
                }
                val remaining = (deadline - System.currentTimeMillis()).coerceAtMost(250L)
                if (remaining > 0L) {
                    latch.await(remaining, TimeUnit.MILLISECONDS)
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "Error waiting for WhatsApp contact sync: ${e.message}")
        } finally {
            try {
                ctx.contentResolver.unregisterContentObserver(observer)
            } catch (_: Exception) {}
            handlerThread.quitSafely()
        }

        return resolvedPackage.get()
    }

    override fun onNewIntent(intent: Intent) = Unit

    private sealed class PreparationResult {
        data class Success(val uri: Uri, val mimeType: String, val fileName: String) : PreparationResult()
        data class Failure(val fileName: String, val reason: String) : PreparationResult()
    }

    private sealed class DownloadResult {
        data class Success(val contentType: String?) : DownloadResult()
        data class Failure(val reason: String) : DownloadResult()
    }

    companion object {
        private const val TAG = "GuestDeviceModule"
        private const val CAMERA_REQUEST_CODE = 7304
    }
}
