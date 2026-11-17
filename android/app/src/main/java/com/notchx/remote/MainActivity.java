package com.notchx.remote;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;
import android.speech.RecognizerIntent;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.annotation.NonNull;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;
import java.util.ArrayList;
import java.util.Arrays;
import org.json.JSONObject;

public class MainActivity extends BridgeActivity {
    private static final int REQ_AUDIO_PERMISSION = 9001;
    private PermissionRequest pendingWebPermissionRequest = null;
    private ActivityResultLauncher<Intent> speechLauncher;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        speechLauncher = registerForActivityResult(
            new ActivityResultContracts.StartActivityForResult(),
            result -> {
                if (result.getResultCode() == Activity.RESULT_OK && result.getData() != null) {
                    ArrayList<String> matches = result.getData().getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS);
                    String text = (matches != null && !matches.isEmpty()) ? matches.get(0) : "";
                    dispatchSpeechEvent("{\"text\":" + JSONObject.quote(text) + "}");
                } else {
                    dispatchSpeechEvent("{\"error\":\"cancelled\"}");
                }
            }
        );

        requestAudioPermissionIfNeeded();
        configureWebViewAudioSupport();
        handleDeepLinkIntent(getIntent());
    }

    private void requestAudioPermissionIfNeeded() {
        boolean hasRecord = ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
            == PackageManager.PERMISSION_GRANTED;
        boolean hasModify = ContextCompat.checkSelfPermission(this, Manifest.permission.MODIFY_AUDIO_SETTINGS)
            == PackageManager.PERMISSION_GRANTED;

        if (!hasRecord || !hasModify) {
            ActivityCompat.requestPermissions(
                this,
                new String[] {
                    Manifest.permission.RECORD_AUDIO,
                    Manifest.permission.MODIFY_AUDIO_SETTINGS
                },
                REQ_AUDIO_PERMISSION
            );
        }
    }

    private void configureWebViewAudioSupport() {
        if (this.bridge == null || this.bridge.getWebView() == null) {
            return;
        }

        this.bridge.getWebView().addJavascriptInterface(new NotchXVoiceBridge(), "NotchXVoice");
        this.bridge.getWebView().setWebChromeClient(new BridgeWebChromeClient(this.bridge) {
            private void forwardToSuper(PermissionRequest req) {
                super.onPermissionRequest(req);
            }

            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(() -> {
                    String[] resources = request.getResources();
                    boolean wantsAudio = resources != null
                        && Arrays.asList(resources).contains(PermissionRequest.RESOURCE_AUDIO_CAPTURE);

                    if (wantsAudio) {
                        if (ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.RECORD_AUDIO)
                            == PackageManager.PERMISSION_GRANTED) {
                            request.grant(resources);
                        } else {
                            pendingWebPermissionRequest = request;
                            requestAudioPermissionIfNeeded();
                        }
                    } else {
                        forwardToSuper(request);
                    }
                });
            }
        });
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQ_AUDIO_PERMISSION && pendingWebPermissionRequest != null) {
            boolean granted = grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED;
            final PermissionRequest req = pendingWebPermissionRequest;
            pendingWebPermissionRequest = null;
            runOnUiThread(() -> {
                if (granted) {
                    req.grant(req.getResources());
                } else {
                    req.deny();
                }
            });
        }
    }

    private void dispatchSpeechEvent(final String detailJson) {
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().post(() -> {
                String js = "window.dispatchEvent(new CustomEvent('notchxNativeSpeechResult', { detail: " + detailJson + " }));";
                getBridge().getWebView().evaluateJavascript(js, null);
            });
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleDeepLinkIntent(intent);
    }

    private void handleDeepLinkIntent(Intent intent) {
        if (intent == null) return;
        Uri data = intent.getData();
        if (data == null) return;
        final String url = data.toString();
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().postDelayed(() -> {
                String safeUrl = url.replace("'", "");
                String js = "window.dispatchEvent(new CustomEvent('notchxWidgetDeepLink', { detail: '" + safeUrl + "' }));";
                getBridge().getWebView().evaluateJavascript(js, null);
            }, 450);
        }
    }

    public class NotchXVoiceBridge {
        @JavascriptInterface
        public boolean isAvailable() {
            return true;
        }

        @JavascriptInterface
        public void startSpeech(final String lang) {
            runOnUiThread(() -> {
                if (ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.RECORD_AUDIO)
                    != PackageManager.PERMISSION_GRANTED) {
                    requestAudioPermissionIfNeeded();
                    dispatchSpeechEvent("{\"error\":\"permission_required\"}");
                    return;
                }

                try {
                    Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
                    intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
                    String activeLang = (lang != null && !lang.trim().isEmpty()) ? lang.trim() : "id-ID";
                    intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, activeLang);
                    intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, activeLang);
                    intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
                    intent.putExtra(RecognizerIntent.EXTRA_PROMPT, "Ucapkan perintah untuk NotchX...");
                    speechLauncher.launch(intent);
                } catch (Exception ex) {
                    dispatchSpeechEvent("{\"error\":" + JSONObject.quote(ex.getMessage() != null ? ex.getMessage() : "speech_unavailable") + "}");
                }
            });
        }
    }
}
