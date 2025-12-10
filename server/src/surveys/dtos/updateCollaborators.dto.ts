import { IsArray, IsMongoId, ArrayNotEmpty } from 'class-validator';

export class UpdateCollaboratorsDto {
  @IsArray()
  @ArrayNotEmpty({ message: 'At least one collaborator is required' })
  @IsMongoId({ each: true, message: 'collaborators must be valid user ids' })
  collaboratorIds: string[];
}
