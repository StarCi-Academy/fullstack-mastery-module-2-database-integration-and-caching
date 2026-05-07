const fs = require('fs');

let file = '3-caching-with-redis/src/app.module.ts';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(/AppModule â€” Cấu hình há»‡ thá»‘ng Caching 3 lá»›p/g, 'AppModule — Cấu hình hệ thống Caching 3 lớp');
c = c.replace(/\(EN: Root module â€” Configures/g, '(EN: Root module — Configures');
c = c.replace(/isGlobal: true, \/\/ Quan trá» ng: Cho phép Inject CACHE_MANAGER vÃ o service layer/g, 'isGlobal: true, // Quan trọng: Cho phép Inject CACHE_MANAGER vào service layer');
c = c.replace(/import \{\r?\n    RequestTimingInterceptor \r?\n\} from "\.\/common\/interceptors\/request-timing\.interceptor"/g, 'import { RequestTimingInterceptor } from "./common"');

fs.writeFileSync(file, c, 'utf8');
console.log('Fixed file');
