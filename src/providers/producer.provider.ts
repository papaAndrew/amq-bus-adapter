import { BindingScope, Provider, inject, injectable } from "@loopback/core";
import {
  AmqBusBindings,
  AmqBusLogAdapter,
  AmqBusOptions,
  AmqConnector,
  ErrorHandler,
  Producer,
  RouteOptions,
} from "./types";

@injectable({ scope: BindingScope.APPLICATION })
export class ProducerProvider implements Provider<Producer> {
  private routeOptions?: RouteOptions;

  private producer: Producer;

  constructor(
    @inject(AmqBusBindings.CONNECTOR)
    connector: AmqConnector,
    @inject(AmqBusBindings.CONFIG)
    options: AmqBusOptions,
    @inject(AmqBusBindings.FATAL_ERROR_HANDLER)
    errorHandler: ErrorHandler,
    @inject(AmqBusBindings.LOG_ADAPTER)
    logAdapter?: AmqBusLogAdapter,
  ) {
    this.routeOptions = options.producer;

    this.producer = new Producer(connector);
    this.producer.setErrorHandler(errorHandler);
    this.producer.setLogAdapter(logAdapter);
  }

  async value(): Promise<Producer> {
    if (this.routeOptions) {
      await this.producer.open(this.routeOptions);
    }
    return this.producer;
  }
}
