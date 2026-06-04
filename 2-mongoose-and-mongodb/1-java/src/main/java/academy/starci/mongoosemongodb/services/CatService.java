package academy.starci.mongoosemongodb.services;

import academy.starci.mongoosemongodb.entities.Cat;
import academy.starci.mongoosemongodb.exceptions.NotFoundException;
import academy.starci.mongoosemongodb.repositories.CatRepository;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@Service
public class CatService {

    private final CatRepository catRepository;
    private final MongoTemplate mongoTemplate;

    public CatService(CatRepository catRepository, MongoTemplate mongoTemplate) {
        this.catRepository = catRepository;
        this.mongoTemplate = mongoTemplate;
    }

    public Cat create(Cat cat) {
        Instant now = Instant.now();
        cat.setCreatedAt(now);
        cat.setUpdatedAt(now);
        if (cat.getLikes() == null) {
            cat.setLikes(0);
        }
        cat.setVersion(0);
        return catRepository.save(cat);
    }

    public List<Cat> findAll() {
        Query query = new Query().with(Sort.by(Sort.Direction.DESC, "age")).limit(10);
        return mongoTemplate.find(query, Cat.class);
    }

    public Cat findByName(String name) {
        return catRepository.findByName(name)
                .orElseThrow(() -> new NotFoundException("Cat with name \"" + name + "\" not found"));
    }

    public List<Cat> findByHobby(String hobby) {
        Query query = new Query(Criteria.where("hobbies").is(hobby));
        return mongoTemplate.find(query, Cat.class);
    }

    public Cat update(String id, Cat updateData) {
        Query query = new Query(Criteria.where("id").is(id));
        Update update = new Update();

        if (updateData.getName() != null) {
            update.set("name", updateData.getName());
        }
        if (updateData.getAge() != null) {
            update.set("age", updateData.getAge());
        }
        if (updateData.getBreed() != null) {
            update.set("breed", updateData.getBreed());
        }
        if (updateData.getHobbies() != null) {
            update.set("hobbies", updateData.getHobbies());
        }
        if (updateData.getMetadata() != null) {
            update.set("metadata", updateData.getMetadata());
        }
        update.set("updatedAt", Instant.now());

        Cat updated = mongoTemplate.findAndModify(
                query,
                update,
                FindAndModifyOptions.options().returnNew(true),
                Cat.class
        );

        if (updated == null) {
            throw new NotFoundException("Cat with id \"" + id + "\" not found");
        }

        return updated;
    }

    public Cat like(String id) {
        Query query = new Query(Criteria.where("id").is(id));
        Update update = new Update().inc("likes", 1).set("updatedAt", Instant.now());

        Cat updated = mongoTemplate.findAndModify(
                query,
                update,
                FindAndModifyOptions.options().returnNew(true),
                Cat.class
        );

        if (updated == null) {
            throw new NotFoundException("Cat with id \"" + id + "\" not found");
        }

        return updated;
    }
}
