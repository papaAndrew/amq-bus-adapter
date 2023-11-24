import { Provider, inject, injectable } from "@loopback/core";
import { AmqConnector } from "../lib/amq-connector";
import { AmqBusBindings } from "../lib/keys";
import { ProducerClient } from "../lib/producer-client";
import {
  AmqBusProducer,
  AmqBusRouteOptions,
  AmqLogAdapter,
} from "../lib/types";

@injectable()
export class AmqBusClientProvider implements Provider<AmqBusProducer> {
  private amqClient: ProducerClient;

  constructor(
    @inject(AmqBusBindings.CONNECTOR)
    connector: AmqConnector,
    @inject(AmqBusBindings.ROUTE_CONFIG)
    routeOptions: AmqBusRouteOptions,
    @inject(AmqBusBindings.LOG_ADAPTER)
    logAdapter?: AmqLogAdapter,
  ) {
    this.amqClient = new ProducerClient(connector, routeOptions, logAdapter);
  }

  value(): AmqBusProducer {
    return this.amqClient;
  }
}
