import { BindingScope, Provider, inject, injectable } from "@loopback/core";
import { ConsumerServer } from "../lib/consumer-server";
import { AmqBusBindings } from "../lib/keys";
import {
  AmqBusServer,
  AmqBusServerFactory,
  AmqConnector,
  ConsumerOptions,
  ErrorHandler,
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

  private async getOnMessage(
    options: ConsumerOptions,
  ): Promise<OnMessageFunction> {
    const context = await this.contextFactory.createContext(options);
    const onMessage = context.onReceiverMessage.bind(context);
    return onMessage;
  }

  private async createServer(options: ConsumerOptions): Promise<AmqBusServer> {
    const { connector, errorHandler } = this;

    const onMessage = await this.getOnMessage(options);

    const server = new ConsumerServer(
      connector,
      options,
      onMessage,
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
