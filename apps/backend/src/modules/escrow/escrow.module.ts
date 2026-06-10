import { Module, type Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EscrowService } from './escrow.service';
import { EscrowController } from './escrow.controller';
import { ESCROW_CHAIN_ADAPTER } from './chain/escrow-chain.adapter';
import { SimulatedChainAdapter } from './chain/simulated.adapter';
import { TrustlessWorkAdapter } from './chain/trustless-work.adapter';

/**
 * ESCROW_MODE selects the chain adapter:
 *  - 'trustless_work' → real Stellar testnet escrows via Trustless Work
 *  - anything else    → simulated adapter (full flow, no chain)
 */
const chainAdapterProvider: Provider = {
  provide: ESCROW_CHAIN_ADAPTER,
  inject: [ConfigService],
  useFactory: (config: ConfigService) =>
    config.get<string>('escrowMode') === 'trustless_work'
      ? new TrustlessWorkAdapter(config)
      : new SimulatedChainAdapter(),
};

@Module({
  controllers: [EscrowController],
  providers: [EscrowService, chainAdapterProvider],
  exports: [EscrowService],
})
export class EscrowModule {}
