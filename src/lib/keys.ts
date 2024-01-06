import {
  BindingAddress,
  BindingKey,
  Component,
  CoreBindings,
} from "@loopback/core";
import {
  AmqBusClient,
  AmqBusLogAdapter,
  AmqBusOptions,
  AmqBusServerContext,
  AmqBusServerFactory,
  AmqBusServerRequest,
  AmqBusServerResponse,
  AmqConnector,
  ErrorHandler,
  ResponseBuilder,
  ServerContextFactory,
} from "./types";

function createKey(name?: string) {
  const baseName = `${CoreBindings.COMPONENTS}.AmqBusComponent`;
  const key = name ? `${baseName}.${name}` : baseName;
  return key;
}

function create<T>(name?: string) {
  const key = createKey(name);
  return BindingKey.create<T>(key);
}

/**
 * Binding keys used by this component.
 */

export module AmqBusBindings {
  export const COMPONENT = create<Component>();

  export const CONFIG: BindingAddress<AmqBusOptions> =
    BindingKey.buildKeyForConfig<AmqBusOptions>(COMPONENT);

  export const FATAL_ERROR_HANDLER = create<ErrorHandler>("fatalErrorHandler");

  export const LOG_ADAPTER = create<AmqBusLogAdapter>("logAdapter");

  export const CONNECTOR = create<AmqConnector>("connector");

  export const PRODUCER_CLIENT = create<AmqBusClient>("producerClient");

  export const CONSUMER_SERVER_FACTORY = create<AmqBusServerFactory>(
    "consumerServerFactory",
  );

  export const SERVER_CONTEXT_FACTORY = create<ServerContextFactory>(
    "serverContextFactory",
  );

  export const RESPONSE_BUILDER = create<ResponseBuilder>("responseBuilder");

  export const Server = {
    CONTEXT: create<AmqBusServerContext>("server.context"),
    REQUEST: create<AmqBusServerRequest>("server.request"),
    RESPONSE: create<AmqBusServerResponse>("server.response"),
  };
}
