package academy.starci.sqlvsnosql.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class CreateCompareDto {
    @NotBlank(message = "Title cannot be blank")
    private String title;

    @NotNull(message = "Amount is required")
    private Double amount;

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public Double getAmount() {
        return amount;
    }

    public void setAmount(Double amount) {
        this.amount = amount;
    }
}
