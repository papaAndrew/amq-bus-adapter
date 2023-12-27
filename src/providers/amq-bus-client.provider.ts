import { BindingScope, Provider, inject, injectable } from "@loopback/core";
import { AmqBusBindings } from "../lib/keys";
import { ProducerClient } from "../lib/producer-client";
import {
  AmqBusClient,
  AmqBusLogAdapter,
  AmqBusOptions,
  AmqConnector,
} from "../lib/types";

@injectable({ scope: BindingScope.REQUEST })
export class AmqBusClientProvider implements Provider<AmqBusClient> {
  private amqClient: ProducerClient;

  constructor(
    @inject(AmqBusBindings.CONNECTOR)
    connector: AmqConnector,
    @inject(AmqBusBindings.CONFIG)
    options: AmqBusOptions,
    @inject(AmqBusBindings.LOG_ADAPTER)
    logAdapter?: AmqBusLogAdapter,
  ) {
    this.amqClient = new ProducerClient(
      logAdapter,
      connector,
      options.producer,
    );
  }

  value(): AmqBusClient {
    return this.amqClient;
  }
}
