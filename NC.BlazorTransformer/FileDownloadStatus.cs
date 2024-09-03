namespace NC.BlazorTransformer;

public record FileDownloadStatus(string? FileName, string? Status, long? Loaded, long? Total, bool IsError)
{
    public double? ProgressFraction => Loaded != null && Total != null ?  (double)Loaded / Total : 0d;

    public bool IsCompleted => Loaded == Total;
}