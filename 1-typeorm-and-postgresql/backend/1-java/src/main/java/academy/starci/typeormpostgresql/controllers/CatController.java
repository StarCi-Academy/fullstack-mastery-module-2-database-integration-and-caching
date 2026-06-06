package academy.starci.typeormpostgresql.controllers;

import academy.starci.typeormpostgresql.entities.Cat;
import academy.starci.typeormpostgresql.entities.Toy;
import academy.starci.typeormpostgresql.services.CatService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for the {@code /cats} resource — HTTP layer only.
 * <p>
 * Delegates all business logic to {@link CatService}. Each handler maps exactly one
 * HTTP verb + path combination to the corresponding service method.
 * Error mapping (e.g. {@link academy.starci.typeormpostgresql.exceptions.NotFoundException} → 404)
 * is handled by a global exception handler ({@code @ControllerAdvice}).
 */
@RestController
@RequestMapping("/cats")
public class CatController {

    /**
     * Service that encapsulates business logic and data-access for the Cat domain.
     */
    private final CatService catService;

    /**
     * Constructor injection — keeps the controller testable without Spring context.
     *
     * @param catService the Cat domain service.
     */
    public CatController(CatService catService) {
        this.catService = catService;
    }

    /**
     * GET /cats — Returns all cats with their relations.
     *
     * @return list of all cats (may be empty, never {@code null}).
     */
    @GetMapping
    public List<Cat> findAll() {
        return catService.findAll();
    }

    /**
     * POST /cats — Creates a new cat with nested relations (passport, toys, owners).
     * Responds with HTTP 201 Created on success.
     *
     * @param cat deserialized cat payload from the request body.
     * @return the persisted cat with auto-generated IDs.
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Cat create(@RequestBody Cat cat) {
        // Delegate to service which wires bidirectional FK links before saving.
        return catService.create(cat);
    }

    /**
     * GET /cats/{id} — Returns a single cat by ID.
     * Responds with HTTP 404 if the cat does not exist.
     *
     * @param id the cat's primary key (extracted from path variable).
     * @return the found cat entity with relations.
     */
    @GetMapping("/{id}")
    public Cat findOne(@PathVariable Integer id) {
        return catService.findOne(id);
    }

    /**
     * GET /cats/{id}/with-relations — Returns a cat with all relations explicitly hydrated.
     * Semantically identical to {@link #findOne(Integer)} for this demo; exists to mirror
     * the TypeScript API contract and demonstrate the pattern of explicit relation loading.
     *
     * @param id the cat's primary key.
     * @return the cat with passport, toys, and owners populated.
     */
    @GetMapping("/{id}/with-relations")
    public Cat findWithRelations(@PathVariable Integer id) {
        return catService.findWithRelations(id);
    }

    /**
     * POST /cats/{id}/toys — Appends a new toy to an existing cat.
     * Responds with HTTP 201 Created and returns the updated cat (with the enlarged toys array).
     *
     * @param id  the cat's primary key.
     * @param toy toy data from the request body (requires at minimum a {@code name}).
     * @return the updated cat entity reflecting the new toy in the {@code toys} collection.
     */
    @PostMapping("/{id}/toys")
    @ResponseStatus(HttpStatus.CREATED)
    public Cat addToy(@PathVariable Integer id, @RequestBody Toy toy) {
        // Delegate to service which sets toy.cat = cat so Hibernate writes catId FK.
        return catService.addToy(id, toy);
    }
}
