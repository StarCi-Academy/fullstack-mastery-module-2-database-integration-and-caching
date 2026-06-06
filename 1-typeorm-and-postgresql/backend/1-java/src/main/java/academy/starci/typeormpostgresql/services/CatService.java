package academy.starci.typeormpostgresql.services;

import academy.starci.typeormpostgresql.entities.Cat;
import academy.starci.typeormpostgresql.entities.Toy;
import academy.starci.typeormpostgresql.exceptions.NotFoundException;
import academy.starci.typeormpostgresql.repositories.CatRepository;
import academy.starci.typeormpostgresql.repositories.ToyRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class CatService {

    private final CatRepository catRepository;
    private final ToyRepository toyRepository;

    public CatService(CatRepository catRepository, ToyRepository toyRepository) {
        this.catRepository = catRepository;
        this.toyRepository = toyRepository;
    }

    public List<Cat> findAll() {
        return catRepository.findAll();
    }

    @Transactional
    public Cat create(Cat cat) {
        // Set bidirectional relationship links
        if (cat.getPassport() != null) {
            cat.getPassport().setCat(cat);
        }
        if (cat.getToys() != null) {
            for (Toy toy : cat.getToys()) {
                toy.setCat(cat);
            }
        }
        return catRepository.save(cat);
    }

    public Cat findOne(Integer id) {
        return catRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Cat with ID " + id + " not found"));
    }

    public Cat findWithRelations(Integer id) {
        return findOne(id);
    }

    @Transactional
    public Cat addToy(Integer catId, Toy toy) {
        Cat cat = findOne(catId);
        toy.setCat(cat);
        toyRepository.save(toy);
        return findOne(catId);
    }
}
