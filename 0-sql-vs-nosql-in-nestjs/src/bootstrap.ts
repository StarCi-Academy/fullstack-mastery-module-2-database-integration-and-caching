/**
 * Khởi tạo Nest app — ValidationPipe toàn cục, lắng nghe cổng.
 * (EN: Bootstrap Nest app — global ValidationPipe, listen on port.)
 */
import {
    ValidationPipe,
} from "@nestjs/common"
import {
    NestFactory,
} from "@nestjs/core"
import {
    AppModule,
} from "./app.module"

export async function bootstrap(): Promise<void> {
    const app = await NestFactory.create(AppModule)
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            transform: true,
            forbidNonWhitelisted: true,
        }),
    )
    // Cổng: biến môi trường PORT hoặc 3000.
    // (EN: Port from env PORT or default 3000.)
    const port = Number(process.env.PORT) || 3000
    await app.listen(port,
        "0.0.0.0")
}
