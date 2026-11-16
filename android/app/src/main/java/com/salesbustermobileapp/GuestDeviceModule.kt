package com.salesbustermobileapp

import android.app.Activity
import android.content.Intent
import android.graphics.BitmapFactory
import android.net.Uri
import android.provider.MediaStore
import android.util.Base64
import androidx.core.content.FileProvider
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.ByteArrayOutputStream
import java.io.File

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

    override fun onNewIntent(intent: Intent) = Unit

    companion object {
        private const val CAMERA_REQUEST_CODE = 7304
    }
}
