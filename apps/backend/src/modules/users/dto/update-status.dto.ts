import { IsIn } from 'class-validator';

/** Administrator action: set an account's standing (active or suspended). */
export class UpdateUserStatusDto {
  @IsIn(['active', 'suspended'])
  status: 'active' | 'suspended';
}
