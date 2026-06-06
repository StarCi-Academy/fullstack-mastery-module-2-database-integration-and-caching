package academy.starci.typeormpostgresql;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Spring Boot application entry point for the Cat ORM demo.
 * <p>
 * {@code @SpringBootApplication} enables auto-configuration, component scanning, and property binding.
 * The application connects to PostgreSQL (configured via {@code application.yml}) and exposes
 * a REST API on the port defined by {@code server.port} (default: 3000).
 */
@SpringBootApplication
public class CatApplication {

    /**
     * Launches the Spring Boot application.
     *
     * @param args command-line arguments (passed through to Spring for property override support).
     */
    public static void main(String[] args) {
        // SpringApplication.run bootstraps the IoC container, auto-wires beans, and starts the embedded Tomcat.
        SpringApplication.run(CatApplication.class, args);
    }
}
