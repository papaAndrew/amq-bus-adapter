import { BindingScope, Provider, inject, injectable } from "@loopback/core";
import {
  AmqBusBindings,
  AmqBusLogAdapter,
  AmqBusOptions,
  AmqConnector,
  Consumer,
  ConsumerResultHandler,
  ErrorHandler,
  RouteOptions,
} from "./types";

@injectable({ scope: BindingScope.APPLICATION })
export class ConsumerProvider implements Provider<Consumer> {
  private consumer: Consumer;

  private routeOptions?: RouteOptions;

  constructor(
    @inject(AmqBusBindings.CONNECTOR)
    connector: AmqConnector,
    @inject(AmqBusBindings.CONFIG)
    options: AmqBusOptions,
    @inject(AmqBusBindings.FATAL_ERROR_HANDLER)
    errorHandler: ErrorHandler,
    @inject(AmqBusBindings.LOG_ADAPTER)
    logAdapter: AmqBusLogAdapter,
    @inject(AmqBusBindings.CONSUMER_REQUEST, { optional: true })
    requestHandler?: ConsumerResultHandler,
  ) {
    this.routeOptions = options.consumer;

    this.consumer = new Consumer(connector);
    this.consumer.setErrorHandler(errorHandler);
    this.consumer.setConsumerResultHandler(requestHandler);
    this.consumer.setLogAdapter(logAdapter);
  }

  async value(): Promise<Consumer> {
    if (this.routeOptions) {
      // console.log("this.routeOptions", this.routeOptions);
      await this.consumer.open(this.routeOptions);
    }
    return this.consumer;
  }
}
