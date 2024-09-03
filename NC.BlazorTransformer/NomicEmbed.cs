using Microsoft.JSInterop;
using OllamaSharp.Models;

namespace NC.BlazorTransformer;

public class NomicEmbed : BaseWorkerInterop
{
    public override string JSModulePath => "./_content/NC.BlazorTransformer/nomic-embed-host.js";

    public override string ResourceCacheKey => "transformers-cache";

    public override string[] Resources =>
        [
            "/nomic-ai/nomic-embed-text-v1.5/resolve/main/config.json",
            "/nomic-ai/nomic-embed-text-v1.5/resolve/main/tokenizer.json",
            "/nomic-ai/nomic-embed-text-v1.5/resolve/main/tokenizer_config.json",
            "/nomic-ai/nomic-embed-text-v1.5/resolve/main/onnx/model_quantized.onnx"
        ];

    public NomicEmbed(IJSRuntime jsRuntime) : base(jsRuntime) { }

    public ValueTask<EmbedResponse> Embed(string text)
    {
        return this.InvokeModule<EmbedResponse>("embed", text);
    }

}
