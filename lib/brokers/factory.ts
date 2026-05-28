import type { BrokerAdapter, BrokerName } from '@/lib/brokers/types'
import { BybitAdapter } from '@/lib/brokers/bybit/bybit-adapter'
import { DerivAdapter } from '@/lib/brokers/deriv/deriv-adapter'

export function getBrokerAdapter(broker: BrokerName): BrokerAdapter {
  switch (broker) {
    case 'bybit':
      return new BybitAdapter()
    case 'deriv':
      return new DerivAdapter()
  }
}

