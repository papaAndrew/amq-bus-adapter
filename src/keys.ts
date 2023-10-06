import { BindingAddress, BindingKey, CoreBindings } from "@loopback/core";
import {
  AmqBusOptions,
  AmqBusProducer,
  AmqBusRequest,
  AmqBusRequestContext,
  AmqBusResponse,
  AmqBusRouteOptions,
  AmqLogAdapter,
  Amqbus,
  ErrorHandler,
  ResponseBuilder,
} from "./lib";
import { AmqConnector, AmqMessage } from "./lib/amq-connector";

const keyComponent = `${CoreBindings.COMPONENTS}.AmqBusComponent`;
/**
 * Binding keys used by this component.
 */
export namespace AmqBusBindings {
  export const COMPONENT = BindingKey.create(keyComponent);

  export const CONFIG: BindingAddress<AmqBusOptions> =
    BindingKey.buildKeyForConfig<AmqBusOptions>(COMPONENT);

  export const CONNECTOR = BindingKey.create<AmqConnector>(
    `${keyComponent}.Connector`,
  );

  export const FATAL_ERROR_HANDLER = BindingKey.create<ErrorHandler>(
    `${keyComponent}.FatalErrorHandler`,
  );

  export const LOG_ADAPTER = BindingKey.create<AmqLogAdapter>(
    `${keyComponent}.LogAdapter`,
  );

  export const ROUTE_CONFIG = BindingKey.create<AmqBusRouteOptions>(
    `${keyComponent}.RouteConfig`,
  );

  export const Consumer = {
    INSTANCE: BindingKey.create<Amqbus.Consumer>(
      `${keyComponent}.Consumer.Instance`,
    ),
    CONTEXT: BindingKey.create<AmqBusRequestContext>(
      `${keyComponent}.Consumer.Context`,
    ),
    /**
     *
     */
    OPTIONS: BindingKey.create<Amqbus.ConsumeOptions>(
      `${keyComponent}.Consumer.Options`,
    ),
    /**
     *
     */
    REQUEST: BindingKey.create<AmqBusRequest>(
      `${keyComponent}.Consumer.Request`,
    ),
    /**
     *
     */
    RESPONSE: BindingKey.create<AmqBusResponse>(
      `${keyComponent}.Consumer.Response`,
    ),
    SEND_RESPONSE: BindingKey.create<Amqbus.SendResponseFunction>(
      `${keyComponent}.Consumer.SendCb`,
    ),
    INCOMING_MESSAGE: BindingKey.create<AmqMessage>(
      `${keyComponent}.Consumer.IncomingMessage`,
    ),
    /**
     *
     */
    RESPONSE_BUILDER: BindingKey.create<ResponseBuilder>(
      `${keyComponent}.AmqBusResponseBuilder`,
    ),
  };
  /**
   *
   */
  export const Producer = {
    INSTANCE: BindingKey.create<AmqBusProducer>(
      `${keyComponent}.Producer.Instance`,
    ),
  };
}
