import {
  Application,
  Binding,
  BindingScope,
  Component,
  config,
  ContextTags,
  CoreBindings,
  inject,
  injectable,
  LifeCycleObserver,
} from "@loopback/core";
import { AmqBusConsumer } from "./lib/amq-bus-consumer";
import { AmqConnector, ConnectionOptions } from "./lib/amq-connector";
import { ConsumerRequest } from "./lib/consumer-request";
import { ConsumerResponse } from "./lib/consumer-response";
import { AmqBusBindings } from "./lib/keys";
import { RequestContext } from "./lib/request-context";
import {
  Amqbus,
  AmqBusOptions,
  AmqBusRouteOptions,
  AmqLogAdapter,
} from "./lib/types";
import { AmqBusClientProvider } from "./providers/amq-bus-client.provider";
import { AmqBusLogAdapterProvider } from "./providers/amq-bus-log-adapter.provider";
import { FatalErrorHandlerProvider } from "./providers/fatal-error-handler.provider";
import { RouteConfigProvider } from "./providers/route-config.provider";

const DEFAULT_TIMEOUT = 60000;

type ConnectionTransport = "tls" | "ssl";

@injectable({ tags: { [ContextTags.KEY]: AmqBusBindings.COMPONENT } })
export class AmqBusComponent implements Component, LifeCycleObserver {
  private logAdapter?: AmqLogAdapter;

  private connector: AmqConnector;

  private consumers: Amqbus.Consumer[] = [];

  private timeout: number = DEFAULT_TIMEOUT;

  bindings: Binding<any>[] = [
    Binding.bind(AmqBusBindings.CONNECTOR)
      .toClass(AmqConnector)
      .inScope(BindingScope.APPLICATION),
    Binding.bind(AmqBusBindings.Consumer.INSTANCE)
      .toInjectable(AmqBusConsumer)
      .inScope(BindingScope.TRANSIENT),
    Binding.bind(AmqBusBindings.Consumer.CONTEXT)
      .toInjectable(RequestContext)
      .inScope(BindingScope.TRANSIENT),
    Binding.bind(AmqBusBindings.Consumer.REQUEST)
      .toInjectable(ConsumerRequest)
      .inScope(BindingScope.REQUEST),
    Binding.bind(AmqBusBindings.Consumer.RESPONSE)
      .toInjectable(ConsumerResponse)
      .inScope(BindingScope.REQUEST),
    Binding.bind(AmqBusBindings.Producer.INSTANCE)
      .toProvider(AmqBusClientProvider)
      .inScope(BindingScope.REQUEST),
    Binding.bind(AmqBusBindings.LOG_ADAPTER)
      .toProvider(AmqBusLogAdapterProvider)
      .inScope(BindingScope.TRANSIENT),
    Binding.bind(AmqBusBindings.FATAL_ERROR_HANDLER)
      .toProvider(FatalErrorHandlerProvider)
      .inScope(BindingScope.SINGLETON),
    Binding.bind(AmqBusBindings.ROUTE_CONFIG)
      .toProvider(RouteConfigProvider)
      .inScope(BindingScope.SINGLETON),
  ];

  constructor(
    @inject(CoreBindings.APPLICATION_INSTANCE)
    private application: Application,
    @config()
    private options: AmqBusOptions,
  ) {
    const { timeout } = options;
    if (timeout) {
      this.timeout = Number(timeout);
    }

    this.bindings.push(Binding.bind(AmqBusBindings.CONFIG).to(this.options));
  }

  private async openConsumer(
    options: Amqbus.ConsumeOptions,
  ): Promise<Amqbus.Consumer> {
    return this.application
      .get(AmqBusBindings.Consumer.INSTANCE)
      .then(async (consumer) => {
        consumer.open(options);
        this.consumers.push(consumer);
        await this.logAdapter?.onConsumerOpen({ options });
        return consumer;
      });
  }

  private async openConsumers(
    options: AmqBusRouteOptions | AmqBusRouteOptions[],
  ) {
    const cfgs = Array.isArray(options) ? options : [options];

    const tasks: Promise<void>[] = cfgs.map(async (cfg, i) => {
      const { name, timeout } = cfg;
      const opts = {
        ...cfg,
        name: name ?? `Consumer_${i}`,
        timeout: timeout ?? this.timeout,
      } as Amqbus.ConsumeOptions;
      await this.openConsumer(opts);
    });
    await Promise.all(tasks);
  }

  private closeConsumers() {
    if (this.consumers) {
      this.consumers.forEach((consumer) => consumer.close());
    }
  }

  private async connect() {
    const { transport, port, ...cfg } = this.options.connector;
    const connectionOptions: ConnectionOptions = transport
      ? {
          ...cfg,
          port: Number(port),
          transport: <ConnectionTransport>transport,
        }
      : {
          ...cfg,
          port: Number(port),
        };

    await this.connector
      .connect(connectionOptions)
      .then(() => {
        this.logAdapter?.onConnect({ connectionOptions });
      })
      .catch(this.onFatalError.bind(this));
  }

  protected onFatalError(err: any) {
    const handler = this.application.getSync(
      AmqBusBindings.FATAL_ERROR_HANDLER,
    );
    console.error("Fatal Error", err);

    handler(err);
  }

  async init() {
    this.logAdapter = await this.application.get(AmqBusBindings.LOG_ADAPTER);
    this.connector = await this.application.get(AmqBusBindings.CONNECTOR);
    this.application.bind(AmqBusBindings.CONNECTOR).to(this.connector);
  }

  async start() {
    await this.connect();
    if (this.options.consumer) {
      await this.openConsumers(this.options.consumer).catch(
        this.onFatalError.bind(this),
      );
    }
  }

  async stop() {
    this.closeConsumers();
    this.connector.disconnect();
  }
}
