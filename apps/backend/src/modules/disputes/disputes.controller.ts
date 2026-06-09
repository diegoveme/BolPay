import { Controller } from '@nestjs/common';
import { DisputesService } from './disputes.service';

@Controller('disputes')
export class DisputesController {
  constructor(private readonly disputesService: DisputesService) {}

  // TODO: define routes for disputes
}
