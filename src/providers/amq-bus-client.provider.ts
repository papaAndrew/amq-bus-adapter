import { BindingScope, Provider, inject, injectable } from "@loopback/core";
import { AmqBusBindings } from "../keys";
import { AmqBusProducer, AmqBusRouteOptions, AmqLogAdapter } from "../lib";
import { AmqConnector } from "../lib/amq-connector";
import { ProducerClient } from "../lib/producer-client";

@injectable({
  scope: BindingScope.REQUEST,
})
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
