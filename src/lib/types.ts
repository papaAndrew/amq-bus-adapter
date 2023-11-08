import { ValueOrPromise } from "@loopback/core";
import { AmqMessage } from "./amq-connector";

export { AmqMessage } from "./amq-connector";

export interface AmqConnectorOptions {
  transport: string | undefined;
  host: string | undefined;
  port: string | number | undefined;
  username?: string | undefined;
  password?: string | undefined;
  ca?: string | Buffer | (string | Buffer)[] | undefined;
}

export interface AmqBusRouteOptions {
  name?: string | undefined;
  path?: string | undefined;
  timeout?: number;
  inputQueue?: string | undefined;
  outputQueue?: string | undefined;
}

/**
 * Component's main config
 */
export interface AmqBusOptions {
  connector: AmqConnectorOptions;
  backoutQueue?: string | undefined;
  timeout?: number | string | undefined;
  consumer?: AmqBusRouteOptions | AmqBusRouteOptions[];
  producer?: AmqBusRouteOptions | AmqBusRouteOptions[];
}

// export type RouteConfigMap = Record<string, AmqBusRouteOptions>;

/**
 * ResponseBuilder
 */
export interface ResponseBuilder {
  buildResponse(requestBody: string): Promise<string | undefined>;
}

/**
 *
 */
export type XrequestId = string | undefined;

export type ErrorHandler = (err?: any) => void;

export interface AmqLogAdapter {
  onConnect(metadata: object): ValueOrPromise<void>;
  onDisconnect(metadata: object): ValueOrPromise<void>;
  onConsumerOpen(metadata: object): ValueOrPromise<void>;
  onConsumerRequest(
    options: AmqBusRouteOptions,
    message?: AmqMessage,
  ): ValueOrPromise<void>;
  onConsumerResponse(
    options: AmqBusRouteOptions,
    message?: AmqMessage,
  ): ValueOrPromise<void>;
  onConsumerBackout(
    options: AmqBusRouteOptions,
    message?: AmqMessage,
  ): ValueOrPromise<void>;
  onProducerRequest(
    options: AmqBusRouteOptions,
    message: AmqMessage,
  ): ValueOrPromise<void>;
  onProducerResponse(
    options: AmqBusRouteOptions,
    message: AmqMessage,
  ): ValueOrPromise<void>;
  onError(message: string, err: any): ValueOrPromise<void>;
}

/**
 *
 */
export interface AmqBusRequest {
  inputQueue: string;
  messageId: string;
  correlationId?: string;
}

/**
 *
 */
export interface AmqBusResponse {
  send(responseBody: string): Promise<AmqMessage>;
}

/**
 *
 */
export interface AmqBusRequestContext {
  request: AmqBusRequest;
  response?: AmqBusResponse;
}

/**
 *
 */
export interface AmqBusProducer {
  notify(requestBody: string, correlationId?: string): Promise<AmqMessage>;
  requestReply(requestBody: string): Promise<AmqMessage>;
}

/**
 *
 */
export namespace Amqbus {
  export interface ConsumeOptions extends AmqBusRouteOptions {
    name: string;
    inputQueue: string;
  }

  export interface ProduceOptions extends AmqBusRouteOptions {
    name: string;
    outputQueue: string;
  }

  export interface Consumer {
    open(options: ConsumeOptions): void;
    close(): void;
  }

  export type SendResponseFunction = (amqMessage: AmqMessage) => Promise<void>;

  export interface ConsumerContext {
    build(
      options: AmqBusRouteOptions,
      requestMessage: AmqMessage,
      onResponse: SendResponseFunction,
    ): void;
  }

  // export interface Producer {
  //   open(options: ProduceOptions): void;
  //   close(): void;
  // }

  export interface IncomingMessage extends AmqMessage {
    messageId: string;
    data: string;
  }
  export interface OutcomingMessage extends AmqMessage {
    correlationId: string;
  }

  export interface ApplictionProperties {
    messageId?: string;
    correlationId?: string;
  }

  export interface Request extends AmqBusRequest {
    receive(incomingMessage: Amqbus.IncomingMessage): void;
  }

  export interface Response extends AmqBusResponse {
    init(onResponse: SendResponseFunction): void;
  }
}
