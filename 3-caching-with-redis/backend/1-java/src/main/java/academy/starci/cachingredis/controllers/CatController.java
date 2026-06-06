package academy.starci.cachingredis.controllers;

import academy.starci.cachingredis.entities.Cat;
import academy.starci.cachingredis.services.CatService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/cats")
public class CatController {

    private final CatService catService;

    public CatController(CatService catService) {
        this.catService = catService;
    }

    @PostMapping("/seed")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> seedCats(@RequestParam(required = false, defaultValue = "1000") int count) {
        return catService.seedCats(count);
    }

    @GetMapping("/response-layer")
    public String getResponseCache() {
        return catService.findForResponseCacheWithDelay();
    }

    @DeleteMapping("/response-layer/cache")
    public Map<String, String> clearResponseLayerCache() {
        return catService.clearResponseLayerCache();
    }

    @GetMapping("/logic-layer")
    public Map<String, String> getLogicCache() {
        return catService.findByLogicCache();
    }

    @DeleteMapping("/logic-layer/cache")
    public Map<String, String> clearLogicLayerCache() {
        return catService.clearLogicLayerCache();
    }

    @GetMapping("/db-layer")
    public List<Cat> getDbCache() {
        return catService.findByDbCache();
    }

    @DeleteMapping("/db-layer/cache")
    public Map<String, String> clearDbLayerCache() {
        return catService.clearDbLayerCache();
    }

    @GetMapping("/all-layers/{id}")
    public Map<String, Object> getAllLayers(@PathVariable String id) {
        return catService.findAllLayers();
    }

    @DeleteMapping("/all-layers/cache")
    public Map<String, Object> clearAllLayers() {
        return catService.invalidateAllLayers();
    }
}
