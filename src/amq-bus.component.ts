import {
  Component,
  ContextTags,
  inject,
  injectable,
  LifeCycleObserver,
  ProviderMap,
} from "@loopback/core";
import { AmqBusBindings } from "./lib/keys";
import { AmqConnector, Pluggable } from "./lib/types";
import { AmqBusLogAdapterProvider } from "./providers/amq-bus-log-adapter.provider";
import { AmqConnectorProvider } from "./providers/amq-connector.provider";
import { BackoutProducerProvider } from "./providers/backout-producer.provider";
import { BackoutRequestProvider } from "./providers/backout-request.provider";
import { ConsumerProvider } from "./providers/consumer.provider";
import { FatalErrorHandlerProvider } from "./providers/fatal-error-handler.provider";
import { ProducerRequestProvider } from "./providers/producer-request.provider";
import { ProducerProvider } from "./providers/producer.provider";

@injectable({ tags: { [ContextTags.KEY]: AmqBusBindings.COMPONENT } })
export class AmqBusComponent implements Component, LifeCycleObserver {
  providers: ProviderMap = {
    [AmqBusBindings.FATAL_ERROR_HANDLER.key]: FatalErrorHandlerProvider,
    [AmqBusBindings.LOG_ADAPTER.key]: AmqBusLogAdapterProvider,
    [AmqBusBindings.CONNECTOR.key]: AmqConnectorProvider,
    [AmqBusBindings.CONSUMER.key]: ConsumerProvider,
    [AmqBusBindings.PRODUCER.key]: ProducerProvider,
    [AmqBusBindings.PRODUCER_REQUEST.key]: ProducerRequestProvider,
    [AmqBusBindings.BACKOUT_PRODUCER.key]: BackoutProducerProvider,
    [AmqBusBindings.BACKOUT_REQUEST.key]: BackoutRequestProvider,
  };

  private _connector: AmqConnector;

  private _consumer: Pluggable;

  private _producer: Pluggable;

  private _backout: Pluggable;

  async init(
    @inject(AmqBusBindings.CONNECTOR)
    connector: AmqConnector,
    @inject(AmqBusBindings.CONSUMER)
    consumer: Pluggable,
    @inject(AmqBusBindings.PRODUCER)
    producer: Pluggable,
    @inject(AmqBusBindings.BACKOUT_PRODUCER)
    backout: Pluggable,
  ): Promise<void> {
    this._connector = connector;
    this._consumer = consumer;
    this._producer = producer;
    this._backout = backout;
  }

  public get connector(): AmqConnector {
    return this._connector;
  }

  public get consumer(): Pluggable {
    return this._consumer;
  }

  public get producer(): Pluggable {
    return this._producer;
  }

  public get backout(): Pluggable {
    return this._backout;
  }

  async stop() {
    await this._consumer.close();
    await this._producer.close();
    await this._backout.close();
    await this._connector.disconnect();
  }
}
