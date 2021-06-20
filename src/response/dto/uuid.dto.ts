import { IsUUID } from 'class-validator';

export class RespondentIdentifier {
  @IsUUID()
  uuid: string;
}
