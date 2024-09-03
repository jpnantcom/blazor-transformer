using Microsoft.JSInterop;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace NC.BlazorTransformer;

public abstract class BaseWorkerInterop : IAsyncDisposable
{
    public abstract string JSModulePath { get; }

    public virtual string? ResourceCacheKey => null;

    public virtual string[] Resources => [];

    private readonly Lazy<Task<IJSObjectReference>> _module;

    private readonly IJSRuntime _jsRuntime;

    protected virtual void OnDisposing() { }

    public BaseWorkerInterop(IJSRuntime jsRuntime)
    {
        _jsRuntime = jsRuntime;
        _module = new(() => jsRuntime.InvokeAsync<IJSObjectReference>(
            "import", this.JSModulePath).AsTask());
    }

    public async ValueTask DisposeAsync()
    {
        if (_module.IsValueCreated)
        {
            var module = await _module.Value;
            await module.DisposeAsync();
        }

        this.OnDisposing();
    }

    protected Task<IJSObjectReference> GetModule()
    {
        return _module.Value;
    }

    protected async ValueTask<T> InvokeModule<T>( string method, params object?[]? parameters)
    {
        var module = await this.GetModule();
        return await module.InvokeAsync<T>( method, parameters );
    }

    protected async ValueTask InvokeModule(string method, params object?[]? parameters)
    {
        var module = await this.GetModule();
        await module.InvokeVoidAsync(method, parameters);
    }

    private bool _isLoaded = false;

    /// <summary>
    /// Download Resources required by this Worker
    /// </summary>
    /// <param name="baseUrl"></param>
    /// <returns></returns>
    public async ValueTask LoadResources(string baseUrl, Action<FileDownloadStatus> callback)
    {
        if (_isLoaded)
        {
            return;
        }

        foreach (var r in this.Resources)
        {
            var downloader = new FileDownloader(_jsRuntime);
            downloader.DownloadProgress += (s, e) => callback(e);

            await downloader.DownloadAndCache($"{baseUrl.TrimEnd('/')}{r}", this.ResourceCacheKey ?? this.GetType().Name); ;
            await downloader.DisposeAsync();
        }

        _isLoaded = true;
    }
}
