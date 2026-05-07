/**
 * DTO tạo item so sánh — validate title (string) + amount (number).
 * (EN: DTO for comparison item creation — validates title (string) + amount (number).)
 */
import {
    IsNotEmpty,
    IsNumber,
    IsString,
} from "class-validator"

export class CreateCompareDto {
    @IsString()
    @IsNotEmpty()
        title!: string

    @IsNumber()
        amount!: number
}
