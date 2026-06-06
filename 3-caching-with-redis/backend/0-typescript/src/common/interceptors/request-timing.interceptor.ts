/**
 * Interceptor — request-timing.interceptor.
 * Wraps every HTTP request and emits a `[TIME]` log line after the
 * response is sent.  This is the key observability hook that makes the
 * cache MISS/HIT latency gap visible in the terminal output.
 */
import {
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor,
} from "@nestjs/common"
import {
    Observable, tap
} from "rxjs"

/**
 * RequestTimingInterceptor — Measures request duration and prints it to the console.
 * Registered globally in AppModule so every endpoint is instrumented automatically.
 * Learners run two consecutive curl calls and see the TIME drop (MISS → HIT).
 */
@Injectable()
export class RequestTimingInterceptor implements NestInterceptor {
    /**
     * Wraps the downstream handler in an RxJS `tap` so the timing
     * measurement runs after the response has been produced (not before).
     * @param context - NestJS execution context (HTTP adapter).
     * @param next - The downstream handler (controller method).
     * @returns Observable that emits the handler result and logs timing on completion.
     */
    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        // Extract HTTP request/response objects from the NestJS context
        const http = context.switchToHttp()
        const request = http.getRequest<Request & { method?: string; url?: string }>()
        const response = http.getResponse<{ statusCode?: number }>()

        // Record wall-clock start time before the handler runs
        const start = Date.now()

        return next.handle().pipe(
            // `tap` fires AFTER the observable value is emitted (i.e. response ready)
            tap(() => {
                const durationMs = Date.now() - start
                const method = request.method ?? "UNKNOWN_METHOD"
                const url = request.url ?? "UNKNOWN_URL"
                // Fall back to 200 because Express sets statusCode lazily
                const statusCode = response.statusCode ?? 200
                // Emit a structured log line easy to grep in terminal output
                console.log(`[TIME] ${method} ${url} ${statusCode} ${durationMs}ms`)
            }),
        )
    }
}
