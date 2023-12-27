import {
  BindingScope,
  Context,
  Provider,
  inject,
  injectable,
} from "@loopback/core";
import { ConsumerServerFactory } from "../lib/consumer-server-factory";
import { AmqBusBindings } from "../lib/keys";
import {
  AmqBusLogAdapter,
  AmqBusServerFactory,
  AmqConnector,
  ErrorHandler,
  ResponseBuilder,
} from "../lib/types";

@injectable({ scope: BindingScope.SINGLETON })
export class AmqBusServerFactoryProvider
  implements Provider<AmqBusServerFactory>
{
  private factory: ConsumerServerFactory;

  constructor(
    @inject(AmqBusBindings.CONNECTOR)
    connector: AmqConnector,
    @inject(AmqBusBindings.FATAL_ERROR_HANDLER)
    errorHandler: ErrorHandler,
    @inject.context()
    parentContext: Context | undefined,
    @inject(AmqBusBindings.LOG_ADAPTER)
    logAdapter: AmqBusLogAdapter,
    @inject(AmqBusBindings.RESPONSE_BUILDER, { optional: true })
    responseBuilder?: ResponseBuilder,
  ) {
    console.log("responseBuilder?", responseBuilder);

    this.factory = new ConsumerServerFactory(
      logAdapter,
      connector,
      errorHandler,
      responseBuilder,
      parentContext,
    );
  }

  value(): AmqBusServerFactory {
    return this.factory;
  }
}
