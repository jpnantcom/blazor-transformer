using Microsoft.JSInterop;
using OllamaSharp.Models.Chat;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace NC.BlazorTransformer;

public class FileDownloader : BaseWorkerInterop, IWorkerProgressReceiver
{
    public override string JSModulePath => "./_content/NC.BlazorTransformer/downloader-host.js";

    public event EventHandler? DownloadComplete;

    public event EventHandler<string>? DownloadError;

    public event EventHandler<FileDownloadStatus>? DownloadProgress;

    public FileDownloadStatus Status { get; private set; } = new(null, null, 0, 0, false);

    public string FileName { get; private set; }

    [JSInvokable]
    public Task Complete()
    {
        this.Status = new FileDownloadStatus(this.FileName, "Completed", this.Status.Loaded, this.Status.Total, true);
        this.DownloadComplete?.Invoke(this, EventArgs.Empty);

        return Task.CompletedTask;
    }

    [JSInvokable]
    public Task Error(string message)
    {
        this.Status = new FileDownloadStatus(this.FileName, message, this.Status.Loaded, this.Status.Total, true);
        this.DownloadError?.Invoke(this, message);

        return Task.CompletedTask;
    }

    [JSInvokable]
    public Task Progress(string status, long? loaded, long? total)
    {
        this.Status = new FileDownloadStatus(this.FileName, status, loaded, total, false);
        this.DownloadProgress?.Invoke(this, this.Status);

        return Task.CompletedTask;
    }

    public FileDownloader(IJSRuntime jsRuntime) : base(jsRuntime) { }

    private DotNetObjectReference<FileDownloader>? _me;

    /// <summary>
    /// Download file and cache
    /// </summary>
    /// <param name="url"></param>
    /// <param name="cacheKey"></param>
    /// <returns></returns>
    public ValueTask DownloadAndCache(string url, string cacheKey)
    {
        if (_me != null)
        {
            // already called
            throw new InvalidOperationException("DownloadAndCache already called");
        }

        if (_me == null)
        {
            _me = DotNetObjectReference.Create(this);
        }

        this.FileName = url;

        return this.InvokeModule("download", url, cacheKey, _me);
    }

    protected override void OnDisposing()
    {
        _me?.Dispose();
    }
}