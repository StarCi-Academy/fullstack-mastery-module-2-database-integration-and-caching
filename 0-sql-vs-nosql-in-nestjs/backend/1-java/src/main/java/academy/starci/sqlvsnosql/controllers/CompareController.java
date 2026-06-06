package academy.starci.sqlvsnosql.controllers;

import academy.starci.sqlvsnosql.dto.CreateCompareDto;
import academy.starci.sqlvsnosql.services.CompareService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/compare")
public class CompareController {

    private final CompareService compareService;

    public CompareController(CompareService compareService) {
        this.compareService = compareService;
    }

    @PostMapping("/write")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> write(@Valid @RequestBody CreateCompareDto dto) {
        return compareService.write(dto);
    }

    @GetMapping("/read")
    public Map<String, Object> read() {
        return compareService.read();
    }

    @GetMapping("/timings")
    public Map<String, Object> getTimings() {
        return compareService.getTimings();
    }

    @DeleteMapping("/all")
    public Map<String, Object> deleteAll() {
        return compareService.deleteAll();
    }
}
