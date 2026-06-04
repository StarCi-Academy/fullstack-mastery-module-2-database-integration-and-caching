package academy.starci.typeormpostgresql.controllers;

import academy.starci.typeormpostgresql.entities.Cat;
import academy.starci.typeormpostgresql.entities.Toy;
import academy.starci.typeormpostgresql.services.CatService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/cats")
public class CatController {

    private final CatService catService;

    public CatController(CatService catService) {
        this.catService = catService;
    }

    @GetMapping
    public List<Cat> findAll() {
        return catService.findAll();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Cat create(@RequestBody Cat cat) {
        return catService.create(cat);
    }

    @GetMapping("/{id}")
    public Cat findOne(@PathVariable Integer id) {
        return catService.findOne(id);
    }

    @GetMapping("/{id}/with-relations")
    public Cat findWithRelations(@PathVariable Integer id) {
        return catService.findWithRelations(id);
    }

    @PostMapping("/{id}/toys")
    @ResponseStatus(HttpStatus.CREATED)
    public Cat addToy(@PathVariable Integer id, @RequestBody Toy toy) {
        return catService.addToy(id, toy);
    }
}
