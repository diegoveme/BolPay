import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthUser } from '../../common/types/auth';
import { EscrowService } from './escrow.service';
import { TrustlineService } from './trustline.service';
import { SubmitSignedDto } from './dto/submit-signed.dto';
import { TrustlineAddressDto } from './dto/trustline.dto';

@ApiTags('escrows')
@ApiBearerAuth()
@Controller('escrows')
export class EscrowController {
  constructor(
    private readonly escrowService: EscrowService,
    private readonly trustline: TrustlineService,
  ) {}

  /** Whether the wallet already trusts USDC (gates send/receive of payments). */
  @Get('usdc-trustline')
  @ApiOperation({ summary: 'Check if a wallet has the USDC trustline.' })
  trustlineStatus(@Query('address') address: string) {
    return this.trustline.status(address);
  }

  /** Build the unsigned changeTrust(USDC) tx for the wallet to sign. */
  @Post('usdc-trustline/prepare')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Prepare the USDC trustline transaction.' })
  prepareTrustline(@Body() dto: TrustlineAddressDto) {
    return this.trustline.prepare(dto.address);
  }

  /** Broadcast a signed changeTrust (used by self-custodial wallets). */
  @Post('usdc-trustline/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Broadcast a signed USDC trustline transaction.' })
  submitTrustline(@Body() dto: SubmitSignedDto) {
    return this.trustline.submit(dto.signedXdr);
  }

  /** Platform-wide escrow monitor (administrators). */
  @Get()
  @Roles('administrator')
  listAll() {
    return this.escrowService.listAll();
  }

  /**
   * Relay a transaction signed by a self-custodial wallet (Stellar Wallets Kit)
   * to the chain provider. Pollar wallets sign+submit on the client and do not
   * use this.
   */
  @Post('submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Broadcast a self-custodial-signed escrow transaction.' })
  submitSigned(@Body() dto: SubmitSignedDto, @CurrentUser() _user: AuthUser) {
    return this.escrowService.submitSignedTx(dto.signedXdr);
  }

  /** Fetch a single escrow the caller is a party to. */
  @Get(':id')
  findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.escrowService.findById(id, user);
  }
}
