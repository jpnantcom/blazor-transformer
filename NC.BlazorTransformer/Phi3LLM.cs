using Microsoft.JSInterop;
using OllamaSharp;
using OllamaSharp.Models;
using OllamaSharp.Models.Chat;
using System.Text;
using static System.Net.Mime.MediaTypeNames;

namespace NC.BlazorTransformer;

public class Phi3LLM : BaseWorkerInterop
{
    public override string JSModulePath => "./_content/NC.BlazorTransformer/phi3-host.js";

    public override string ResourceCacheKey => "transformers-cache";

    public override string[] Resources =>
        [
            "/microsoft/Phi-3-mini-4k-instruct-onnx-web/resolve/main/tokenizer_config.json",
            "/microsoft/Phi-3-mini-4k-instruct-onnx-web/resolve/main/tokenizer.json",
            "/microsoft/Phi-3-mini-4k-instruct-onnx-web/resolve/main/config.json",
            "/microsoft/Phi-3-mini-4k-instruct-onnx-web/resolve/main/onnx/model_q4f16.onnx",
            "/microsoft/Phi-3-mini-4k-instruct-onnx-web/resolve/main/onnx/model_q4f16.onnx_data"
        ];

    public Phi3LLM(IJSRuntime jsRuntime) : base(jsRuntime) { }

    private string GetPrompt(string systemPrompt, List<Message> messages)
    {
        var promptBuilder = new StringBuilder();
        promptBuilder.AppendLine("<|system|>");

        if (systemPrompt == null)
        {
            promptBuilder.AppendLine("Assitant is a friendly chatbot designed to answer user query.");
        }
        else
        {
            promptBuilder.AppendLine(systemPrompt);
        }

        promptBuilder.AppendLine("<|end|>");

        bool lastIsUser = false;

        foreach (var message in messages)
        {
            if (message.Role == "user")
            {
                promptBuilder.AppendLine("<|user|>");
                promptBuilder.AppendLine(message.Content);
                promptBuilder.AppendLine("<|end|>");
                lastIsUser = true;
                continue;
            }

            if (message.Role == "assistant")
            {
                promptBuilder.AppendLine("<|assistant|>");
                promptBuilder.AppendLine(message.Content);
                promptBuilder.AppendLine("<|end|>");
                lastIsUser = false;
                continue;
            }
        }

        if (lastIsUser)
        {
            // last message was user, add assistant prompt
            promptBuilder.AppendLine("<|assistant|>");
        }

        return promptBuilder.ToString();
    }

    // Define events
    public event EventHandler<string> OnLog;
    public event EventHandler<string> OnError;
    public event EventHandler<string> OnStreamToken;

    [JSInvokable]
    public void Log(string message)
    {
        OnLog?.Invoke(this, message);
    }

    [JSInvokable]
    public void Error(string message)
    {
        OnError?.Invoke(this, message);
    }

    [JSInvokable]
    public void StreamToken(string token)
    {
        OnStreamToken?.Invoke(this, token);
    }

    private DotNetObjectReference<Phi3LLM>? _me;

    public async ValueTask<ChatDoneResponseStream> Prompt(string systemPrompt, List<Message> messages, RequestOptions options)
    {
        if (_me == null)
        {
            _me = DotNetObjectReference.Create(this);
            await this.InvokeModule("initPhi3");
        }

        return await this.InvokeModule<ChatDoneResponseStream>("submitPrompt", GetPrompt(systemPrompt, messages), options, _me);
    }

}
