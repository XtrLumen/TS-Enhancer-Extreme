package io.github.xtrlumen.vbmeta

import android.content.ContentProvider
import android.content.ContentValues
import android.database.Cursor
import android.net.Uri
import android.os.Bundle
import io.github.xtrlumen.vbmeta.execute.Execute
import java.util.concurrent.CountDownLatch

class Provider : ContentProvider() {
    
    companion object {
        const val AUTHORITY = "Provider"
        
        private fun logout(message: String) {
            println("[TSEE]<GetVBHash-Provider>$message")
        }
    }
    
    override fun onCreate(): Boolean {
        return true
    }
    
    override fun call(method: String, arg: String?, extras: Bundle?): Bundle? {
        logout("调用安全启动哈希获取")
        val latch = CountDownLatch(1)
        val result = Bundle()
        
        Thread {
            val hash = Execute.getVerifiedBootHash()
            if (hash != null) {
                result.putString("VBHash", "${hash}=VBHash")
            } else {
                result.putString("status", "failed")
            }
            latch.countDown()
        }.start()
        
        latch.await()
        return result
    }
    
    override fun query(uri: Uri, projection: Array<String>?, selection: String?, selectionArgs: Array<String>?, sortOrder: String?): Cursor? = null
    override fun getType(uri: Uri): String? = null
    override fun insert(uri: Uri, values: ContentValues?): Uri? = null
    override fun delete(uri: Uri, selection: String?, selectionArgs: Array<String>?): Int = 0
    override fun update(uri: Uri, values: ContentValues?, selection: String?, selectionArgs: Array<String>?): Int = 0
}
