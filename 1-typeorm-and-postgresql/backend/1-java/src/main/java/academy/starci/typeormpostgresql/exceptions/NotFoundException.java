package academy.starci.typeormpostgresql.exceptions;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Domain exception thrown when a requested entity cannot be found.
 * <p>
 * {@code @ResponseStatus(NOT_FOUND)} instructs Spring MVC to return HTTP 404
 * whenever this (unchecked) exception propagates out of a controller method.
 * Using a dedicated domain exception instead of plain {@link RuntimeException}
 * keeps error-mapping explicit and avoids leaking stack traces.
 */
@ResponseStatus(HttpStatus.NOT_FOUND)
public class NotFoundException extends RuntimeException {

    /**
     * Constructs the exception with a human-readable message included in the HTTP 404 body.
     *
     * @param message description of the missing resource, e.g. {@code "Cat with ID 42 not found"}.
     */
    public NotFoundException(String message) {
        super(message);
    }
}
