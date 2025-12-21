import { IsMongoId } from 'class-validator';

export class ModifyCollaboratorDto {
  @IsMongoId({ message: 'userId is invalid' })
  userId: string;
}
