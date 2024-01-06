import {
  Binding,
  BindingScope,
  Component,
  ContextTags,
  inject,
  injectable,
  LifeCycleObserver,
} from "@loopback/core";
import { AmqBusBindings } from "./lib/keys";
import {
  AmqBusLogAdapter,
  AmqBusOptions,
  AmqBusServer,
  AmqBusServerFactory,
  AmqConnector,
  ErrorHandler,
  ResponseBuilder,
} from "./lib/types";
import { AmqBusClientProvider } from "./providers/amq-bus-client.provider";
import { AmqBusLogAdapterProvider } from "./providers/amq-bus-log-adapter.provider";
import { AmqBusServerFactoryProvider } from "./providers/amq-bus-server-factory.provider";
import { AmqConnectorProvider } from "./providers/amq-connector.provider";
import { FatalErrorHandlerProvider } from "./providers/fatal-error-handler.provider";
import { ResponseBuilderProvider } from "./providers/response-builder.provider";

@injectable({ tags: { [ContextTags.KEY]: AmqBusBindings.COMPONENT } })
export class AmqBusComponent implements Component, LifeCycleObserver {
  bindings: Binding<any>[] = [
    Binding.bind(AmqBusBindings.FATAL_ERROR_HANDLER)
      .toProvider(FatalErrorHandlerProvider)
      .inScope(BindingScope.REQUEST),
    Binding.bind(AmqBusBindings.LOG_ADAPTER)
      .toProvider(AmqBusLogAdapterProvider)
      .inScope(BindingScope.REQUEST),
    Binding.bind(AmqBusBindings.CONNECTOR)
      .toProvider(AmqConnectorProvider)
      .inScope(BindingScope.APPLICATION),
    Binding.bind(AmqBusBindings.PRODUCER_CLIENT)
      .toProvider(AmqBusClientProvider)
      .inScope(BindingScope.REQUEST),
    Binding.bind(AmqBusBindings.CONSUMER_SERVER_FACTORY)
      .toProvider(AmqBusServerFactoryProvider)
      .inScope(BindingScope.SINGLETON),
    Binding.bind(AmqBusBindings.RESPONSE_BUILDER)
      .toProvider(ResponseBuilderProvider)
      .inScope(BindingScope.APPLICATION),
  ];

  private _connector: AmqConnector;

  private _server?: AmqBusServer;

  private _logAdapter: AmqBusLogAdapter;

  private _errorHandler: ErrorHandler;

  async init(
    @inject(AmqBusBindings.CONFIG)
    options: AmqBusOptions,
    @inject(AmqBusBindings.RESPONSE_BUILDER)
    responseBuilder: ResponseBuilder,
    @inject(AmqBusBindings.CONSUMER_SERVER_FACTORY)
    factory: AmqBusServerFactory,
    @inject(AmqBusBindings.CONNECTOR)
    connector: AmqConnector,
    @inject(AmqBusBindings.LOG_ADAPTER)
    logAdapter: AmqBusLogAdapter,
    @inject(AmqBusBindings.FATAL_ERROR_HANDLER)
    errorHandler: ErrorHandler,
  ): Promise<void> {
    this._connector = connector;
    this._logAdapter = logAdapter;
    this._errorHandler = errorHandler;

    const consumerConfig = options.consumer;
    if (consumerConfig) {
      const buildResponse = responseBuilder.buildResponse.bind(responseBuilder);
      this._server = await factory.createServer(consumerConfig, buildResponse);
    }
  }

  private async connect() {
    await this._connector
      .connect()
      .then(() => {
        this._logAdapter.onConnect(this._connector.config);
      })
      .catch((err) => {
        // this._logAdapter.onError("Connector exception", err);
        const cause = JSON.stringify(err);
        this._errorHandler({
          sender: AmqBusComponent.name,
          targret: "AmqConnector",
          event: "connect",
          cause,
        });
      });
  }

  private async openConsumers() {
    this._server?.start();
  }

  private async closeConsumers() {
    this._server?.stop();
  }

  private async disconnect() {
    this._connector.disconnect();
    this._logAdapter.onDisconnect({ cause: "Component stopped" });
  }

  async start() {
    await this.connect();
    await this.openConsumers();
  }

  async stop() {
    this.closeConsumers();
    this.disconnect();
  }
}
