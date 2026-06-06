package academy.starci.mongoosemongodb.controllers;

import academy.starci.mongoosemongodb.entities.Cat;
import academy.starci.mongoosemongodb.services.CatService;
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

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Cat create(@RequestBody Cat cat) {
        return catService.create(cat);
    }

    @GetMapping
    public List<Cat> findAll(@RequestParam(required = false) String hobby) {
        if (hobby != null && !hobby.trim().isEmpty()) {
            return catService.findByHobby(hobby);
        }
        return catService.findAll();
    }

    @GetMapping("/search")
    public Cat findByName(@RequestParam String name) {
        return catService.findByName(name);
    }

    @RequestMapping(value = "/{id}", method = {RequestMethod.PUT, RequestMethod.PATCH})
    public Cat update(@PathVariable String id, @RequestBody Cat cat) {
        return catService.update(id, cat);
    }

    @PostMapping("/{id}/like")
    @ResponseStatus(HttpStatus.CREATED)
    public Cat like(@PathVariable String id) {
        return catService.like(id);
    }
}
