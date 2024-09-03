namespace NC.BlazorTransformer;

internal interface IWorkerProgressReceiver
{
    Task Progress(string status, long? loaded, long? total);
    Task Complete();
    Task Error(string message);
}
