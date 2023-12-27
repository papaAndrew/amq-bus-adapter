import { Context, ValueOrPromise } from "@loopback/core";
import { Receiver, ReceiverOptions, Sender, SenderOptions } from "rhea";

export interface ConnectorOptions {
  transport: string | undefined;
  host: string | undefined;
  port: string | number | undefined;
  username?: string | undefined;
  password?: string | undefined;
  ca?: string | Buffer | (string | Buffer)[] | undefined;
}

export interface AmqBusRequestConfig {
  topic?: string | undefined;
  replyTo?: string | undefined;
  messageId?: string | undefined;
  correlationId?: string | undefined;
  body?: string | undefined;
  timeout?: number | string | undefined;
}

export interface ProducerOptions extends AmqBusRequestConfig {}

export interface ConsumerOptions {
  topic?: string | undefined;
  replyTo?: string | undefined;
  timeout?: number | string | undefined;
}

/**
 * Component's main config
 */
export interface AmqBusOptions {
  connector: ConnectorOptions;
  consumer?: ConsumerOptions;
  producer?: ProducerOptions;
}

export interface AmqMessage {
  messageId?: string;
  correlationId?: string;
  data: string | null;
  created?: string;
}

export enum ProduceMsgStatus {
  SUCCESS = "SUCCESS",
  CONFIG_ERROR = "CONFIG_ERROR",
  CONNECTION_ERROR = "CONNECTION_ERROR",
  SENDER_ERROR = "SENDER_ERROR",
  TIMED_OUT = "TIMED_OUT",
  UNKNOWN = "UNKNOWN",
}

export enum ConsumeMsgStatus {
  SUCCESS = "SUCCESS",
  CONFIG_ERROR = "CONFIG_ERROR",
  CONNECTION_ERROR = "CONNECTION_ERROR",
  RECEIVER_ERROR = "RECEIVER_ERROR",
  TIMED_OUT = "TIMED_OUT",
  NO_REPLY = "NO_REPLY",
}

export interface ConsumeMsgResult {
  status: ConsumeMsgStatus;
  address?: string;
  message?: AmqMessage;
  cause?: any; // Error
}

export interface ProduceMsgResult {
  status: ProduceMsgStatus;
  address?: string;
  message?: AmqMessage;
  cause?: any; // Error
  receiveResponse?(options?: {
    address?: string;
    timeout?: number;
  }): Promise<ConsumeMsgResult>;
}

export interface AmqBusClient {
  buildConfig(options?: ProducerOptions): AmqBusRequestConfig;
  createRequest(options?: ProducerOptions): AmqBusClientRequest;
  notify(
    requestBody: string,
    correlationId?: string,
  ): Promise<ProduceMsgResult>;
  requestReply(requestBody: string): Promise<ConsumeMsgResult>;
}

export interface AmqBusServer {
  start(): void;
  stop(): void;
}

export interface AmqBusServerFactory {
  createServer(
    options: ConsumerOptions,
    buildResponse?: BuildResponseFunction,
  ): AmqBusServer;
}
/**
 *
 */
export interface AmqBusServerRequest {
  readonly topic: string;
  incomingMessage: AmqMessage;
}

/**
 *
 */
export interface AmqBusServerResponse {
  send(body: string, topic?: string): Promise<ProduceMsgResult>;
}

/**
 *
 */
export interface AmqBusServerContext extends Context {
  request: AmqBusServerRequest;
  response?: AmqBusServerResponse;
}

export type BuildResponseFunction = (
  requestBody: string,
) => ValueOrPromise<string | void>;
/**
 * ResponseBuilder
 */
export interface ResponseBuilder {
  buildResponse?: BuildResponseFunction;
}

export interface AmqBusClientRequest extends AmqBusRequestConfig {
  send(bodyOrConfig?: string | AmqBusRequestConfig): Promise<ProduceMsgResult>;
}

export type ErrorHandler = (err?: any) => void;

export interface AmqBusLogAdapter {
  onConnect(metadata: object): ValueOrPromise<void>;
  onDisconnect(metadata: object): ValueOrPromise<void>;
  onConsumerOpen(metadata: object): ValueOrPromise<void>;
  onError(message: string, err: any): ValueOrPromise<void>;
  onClientRequest(produceMsgResult: ProduceMsgResult): ValueOrPromise<void>;
  onClientResponse(consumeMsgResult: ConsumeMsgResult): ValueOrPromise<void>;
  onServerRequest(consumeMsgResult: ConsumeMsgResult): ValueOrPromise<void>;
  onServerResponse(produceMsgResult: ProduceMsgResult): ValueOrPromise<void>;
}

export type SendResponseFunction = (amqMessage: AmqMessage) => Promise<void>;

// export interface IncomingMessage extends AmqMessage {
//   messageId: string;
//   data: string;
// }
// export interface OutcomingMessage extends AmqMessage {
//   correlationId: string;
// }

// export interface ApplictionProperties {
//   messageId?: string;
//   correlationId?: string;
// }

// export interface ServerRequest extends AmqBusRequest {
//   receive(incomingMessage: IncomingMessage): void;
// }

// export interface ServerResponse extends AmqBusResponse {
//   init(onResponse: SendResponseFunction): void;
// }

export interface AmqConnector {
  readonly config: any;
  connect(): Promise<void>;
  disconnect(): void;
  isConnected(): boolean;
  createSender(options: string | SenderOptions): Sender;
  createReceiver(options: string | ReceiverOptions): Receiver;
}
