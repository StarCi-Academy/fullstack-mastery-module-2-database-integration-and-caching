package academy.starci.cachingredis;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;

/**
 * Entry point for the Caching-with-Redis Spring Boot application.
 *
 * <p>{@code @SpringBootApplication} enables component scanning, auto-configuration,
 * and property source binding for the entire {@code academy.starci.cachingredis} package.
 *
 * <p>{@code @EnableCaching} activates the Spring Cache abstraction so that
 * {@code @Cacheable}, {@code @CacheEvict}, and other cache annotations are processed
 * by the framework.  The actual Redis connection is configured in
 * {@code application.yml} (Spring Data Redis auto-configuration picks it up).
 */
@SpringBootApplication
@EnableCaching
public class CachingRedisApplication {

    /**
     * Bootstraps the Spring application context and starts the embedded Tomcat server.
     *
     * @param args Command-line arguments forwarded to Spring (unused in this demo).
     */
    public static void main(String[] args) {
        // SpringApplication.run creates and refreshes the application context
        SpringApplication.run(CachingRedisApplication.class, args);
    }
}
