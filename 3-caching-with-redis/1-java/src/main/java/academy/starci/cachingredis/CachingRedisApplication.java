package academy.starci.cachingredis;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;

@SpringBootApplication
@EnableCaching
public class CachingRedisApplication {
    public static void main(String[] args) {
        SpringApplication.run(CachingRedisApplication.class, args);
    }
}
