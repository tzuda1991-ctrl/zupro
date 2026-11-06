#include <jni.h>
#include <string>
#include <vector>
#include <mutex>
#include <algorithm>
#include "llama.h"

namespace {
std::mutex mutex_;
llama_model *model_ = nullptr;
llama_context *ctx_ = nullptr;

void unload() {
    if (ctx_) { llama_free(ctx_); ctx_ = nullptr; }
    if (model_) { llama_model_free(model_); model_ = nullptr; }
}
std::string toString(JNIEnv *env, jstring str) {
    if (!str) return {};
    const char *p = env->GetStringUTFChars(str, nullptr);
    if (!p) return {};
    std::string s(p);
    env->ReleaseStringUTFChars(str, p);
    return s;
}
}

extern "C" JNIEXPORT jboolean JNICALL
Java_com_zupro_ai_OfflineEngine_nativeLoadModel(JNIEnv *env, jobject, jstring path) {
    std::lock_guard<std::mutex> guard(mutex_);
    unload();
    llama_backend_init();
    std::string file = toString(env, path);
    auto mp = llama_model_default_params();
    mp.n_gpu_layers = 0;
    model_ = llama_model_load_from_file(file.c_str(), mp);
    if (!model_) return JNI_FALSE;

    auto cp = llama_context_default_params();
    cp.n_ctx = 1024;
    cp.n_batch = 256;
    cp.n_threads = 4;\n    cp.n_threads_batch = 4;
    ctx_ = llama_init_from_model(model_, cp);
    if (!ctx_) { unload(); return JNI_FALSE; }
    return JNI_TRUE;
}

extern "C" JNIEXPORT jstring JNICALL
Java_com_zupro_ai_OfflineEngine_nativeGenerateStreaming(JNIEnv *env, jobject, jstring question, jint maxTokens, jobject callback) {
    std::lock_guard<std::mutex> guard(mutex_);
    if (!model_ || !ctx_) return env->NewStringUTF("Import a GGUF model first.");
    const std::string q = toString(env, question);
    const std::string prompt = "<|im_start|>system\nYou are ZUPRO, a helpful AI assistant.\n<|im_end|>\n<|im_start|>user\n" + q + "<|im_end|>\n<|im_start|>assistant\n";
    const llama_vocab *vocab = llama_model_get_vocab(model_);
    int needed = -llama_tokenize(vocab, prompt.c_str(), (int)prompt.size(), nullptr, 0, true, true);
    if (needed <= 0 || needed > 800) return env->NewStringUTF("Prompt is too long.");
    std::vector<llama_token> tokens(needed);
    int count = llama_tokenize(vocab, prompt.c_str(), (int)prompt.size(), tokens.data(), needed, true, true);
    if (count < 0) return env->NewStringUTF("Tokenization failed.");

    llama_memory_clear(llama_get_memory(ctx_), true);
    llama_sampler_chain_params sp = llama_sampler_chain_default_params();
    llama_sampler *sampler = llama_sampler_chain_init(sp);
    llama_sampler_chain_add(sampler, llama_sampler_init_temp(0.7f));
    llama_sampler_chain_add(sampler, llama_sampler_init_dist(1234));
    std::string answer;\n    jclass callbackClass = env->GetObjectClass(callback);\n    jmethodID onToken = env->GetMethodID(callbackClass, "onToken", "(Ljava/lang/String;)V");
    int pos = 0;
    bool ok = true;
    while (pos < count) {
        int n = std::min(256, count - pos);
        llama_batch batch = llama_batch_get_one(tokens.data() + pos, n);
        if (llama_decode(ctx_, batch) != 0) { ok = false; break; }
        pos += n;
    }
    if (ok) {
        const int limit = std::max(1, std::min((int)maxTokens, 256));
        for (int i = 0; i < limit && pos < 1023; ++i) {
            llama_token tok = llama_sampler_sample(sampler, ctx_, -1);
            if (llama_vocab_is_eog(vocab, tok)) break;
            char piece[256];
            int n = llama_token_to_piece(vocab, tok, piece, sizeof(piece), 0, true);
            if (n > 0) {
                answer.append(piece, n);
                if (onToken) {
                    std::string chunk(piece, n);
                    jstring part = env->NewStringUTF(chunk.c_str());
                    if (part) {
                        env->CallVoidMethod(callback, onToken, part);
                        env->DeleteLocalRef(part);
                    }
                    if (env->ExceptionCheck()) { env->ExceptionClear(); ok = false; break; }
                }
            }
            llama_sampler_accept(sampler, tok);
            llama_batch batch = llama_batch_get_one(&tok, 1);
            if (llama_decode(ctx_, batch) != 0) { ok = false; break; }
            ++pos;
        }
    }
    llama_sampler_free(sampler);
    if (!ok) answer = "Generation failed. Try a shorter prompt or smaller model.";
    if (answer.empty()) answer = "(No response generated.)";
    return env->NewStringUTF(answer.c_str());
}

extern "C" JNIEXPORT void JNICALL
Java_com_zupro_ai_OfflineEngine_nativeUnloadModel(JNIEnv *, jobject) {
    std::lock_guard<std::mutex> guard(mutex_);
    unload();
}
