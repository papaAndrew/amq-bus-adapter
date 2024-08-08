import {
  BindingAddress,
  BindingKey,
  Component,
  CoreBindings,
} from "@loopback/core";
import {
  AmqBusLogAdapter,
  AmqBusOptions,
  AmqConnector,
  ConsumerResultHandler,
  ErrorHandler,
  Pluggable,
  ProducerRequest,
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

export namespace AmqBusBindings {
  export const COMPONENT = create<Component>();

  export const CONFIG: BindingAddress<AmqBusOptions> =
    BindingKey.buildKeyForConfig<AmqBusOptions>(COMPONENT);

  export const FATAL_ERROR_HANDLER = create<ErrorHandler>(
    "fatal-error-handler",
  );

  export const LOG_ADAPTER = create<AmqBusLogAdapter>("log-adapter");

  export const CONNECTOR = create<AmqConnector>("connector");

  export const PRODUCER = create<Pluggable>("producer");

  export const PRODUCER_REQUEST = create<ProducerRequest>("producer-request");

  export const CONSUMER = create<Pluggable>("consumer");

  export const CONSUMER_REQUEST =
    create<ConsumerResultHandler>("consumer-request");

  export const BACKOUT_PRODUCER = create<Pluggable>("backout-producer");

  export const BACKOUT_REQUEST = create<Pluggable>("backout-request");
}
