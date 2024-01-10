import { BindingScope, Provider, inject, injectable } from "@loopback/core";
import { ConsumerServer } from "../lib/consumer-server";
import { AmqBusBindings } from "../lib/keys";
import {
  AmqBusServer,
  AmqBusServerFactory,
  AmqConnector,
  ConsumerOptions,
  ErrorHandler,
  ReceiverMessageFunction,
  ServerContextFactory,
} from "../lib/types";

type OnMessageFunction = (receiverContext: any) => void;

@injectable({ scope: BindingScope.SINGLETON })
export class AmqBusServerFactoryProvider
  implements Provider<AmqBusServerFactory>
{
  constructor(
    @inject(AmqBusBindings.CONNECTOR)
    private connector: AmqConnector,
    @inject(AmqBusBindings.FATAL_ERROR_HANDLER)
    private errorHandler: ErrorHandler,
    @inject(AmqBusBindings.SERVER_CONTEXT_FACTORY)
    private contextFactory: ServerContextFactory,
  ) {}

  private getReceiverMessageFunction(
    options: ConsumerOptions,
  ): ReceiverMessageFunction {
    return async (ctx: any) =>
      this.contextFactory
        .createContext(options)
        .then(async (context) => context.onReceiverMessage(ctx));
  }

  private createServer(options: ConsumerOptions): AmqBusServer {
    const { connector, errorHandler } = this;

    const receiverMessageFunction = this.getReceiverMessageFunction(options);

    const server = new ConsumerServer(
      connector,
      options,
      receiverMessageFunction,
      errorHandler,
    );

    return server;
  }

  async value(): Promise<AmqBusServerFactory> {
    return {
      createServer: this.createServer.bind(this),
    };
  }
}
