/**
 * Interceptor — request-timing.interceptor.
 * (EN: Interceptor — request-timing.interceptor.)
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
 * RequestTimingInterceptor â€” Äo thá»i gian xử lý request vÃ  in console.
 * (EN: Measures request duration and prints it to console.)
 */
@Injectable()
export class RequestTimingInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        const http = context.switchToHttp()
        const request = http.getRequest<Request & { method?: string; url?: string }>()
        const response = http.getResponse<{ statusCode?: number }>()
        const start = Date.now()

        return next.handle().pipe(
            tap(() => {
                const durationMs = Date.now() - start
                const method = request.method ?? "UNKNOWN_METHOD"
                const url = request.url ?? "UNKNOWN_URL"
                const statusCode = response.statusCode ?? 200
                console.log(`[TIME] ${method} ${url} ${statusCode} ${durationMs}ms`)
            }),
        )
    }
}
