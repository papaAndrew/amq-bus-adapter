import { ValueOrPromise } from "@loopback/core";
import {
  ConnectionDetails,
  Message,
  Receiver,
  ReceiverOptions,
  Sender,
  SenderOptions,
} from "rhea";

/**
 *
 */
export interface ReconnectOptions {
  reconnect: number | string | boolean;
  attemptLimit?: number | string;
  minInterval?: number | string;
  maxInterval?: number | string;
}

/**
 * Конфигурация подключения
 */
export interface ConnectorOptions {
  /**
   * tls | ssl
   */
  transport?: string | undefined;
  /**
   * адрес сервера. можно не указывать, если задан brokers
   */
  host?: string | undefined;
  port?: string | number | undefined;
  /**
   * список брокеров: host1:port1,host2:port2,...
   */
  brokers?: string | undefined;
  /**
   * настройка автореконнекта
   */
  reconnectOptions?: undefined | ReconnectOptions;
  /**
   * аутентификация
   */
  username?: string | undefined;
  password?: string | undefined;
  /**
   * доверенные сертификаты  - буфер или имя файла
   */
  ca?: string | Buffer | (string | Buffer)[] | undefined;
}

export interface RouteOptions {
  /**
   * адрес запросов
   */
  address?: string | undefined;
  /**
   * адрес ответов
   */
  replyTo?: string | undefined;
  /**
   * таймаут подлючения к адресу
   * По умолчанию = 30000
   */
  timeout?: number | string | undefined;
}

/**
 * Интерфейс конфигурауции Компонента
 */
export interface AmqBusOptions {
  connector: ConnectorOptions;
  consumer?: RouteOptions;
  producer?: RouteOptions;
  backout?: RouteOptions;
}

export type MessageHeaders = Record<string, string>;

/**
 * Интерфей Producer Or Receiver
 */
export interface Pluggable {
  connectionError(ctx: any): void;

  senderError(ctx: any): void;

  receiverError(ctx: any): void;

  receiverMessage(ctx: any): void;

  getReceiverAddress(): string;

  getSenderAddress(): string;

  open(options: RouteOptions): Promise<void>;

  close(): Promise<void>;

  isOpen(): boolean;
}

/**
 * Конфигурация клиентского запроса
 */
export interface RequestConfig {
  /**
   * коррелятор
   */
  correlationId?: string;
  /**
   * тело сообщения
   */
  body?: string;
  /**
   * заголовки
   */
  headers?: MessageHeaders;
  /**
   * таймаут ожидания ответа
   * По умолчанию = 60000
   */
  timeout?: number | string | undefined;
}

/**
 * Дескриптор сообщения
 */
export interface AmqMessage {
  messageId?: string;
  correlationId?: string;
  data: string | null;
  created?: string;
  headers?: MessageHeaders;
}

/**
 * Формальный Статус операции
 */

export enum OperationStatus {
  SUCCESS = "SUCCESS",
  CONFIG_ERROR = "CONFIG_ERROR",
  ACCESS_ERROR = "ACCESS_ERROR",
  OPERATION_ERROR = "OPERATION_ERROR",
  TIMED_OUT = "TIMED_OUT",
}

/**
 * Дескриптор результата операции Получения
 */
export interface OperationResult {
  status: OperationStatus;
  address?: string;
  message?: AmqMessage;
  cause?: any; // Error
  statusText?: string;
}

/**
 * Интефейс клиентского запроса
 */
export interface ProducerRequest {
  address: string;
  replyTo?: string;
  send(bodyOrConfig: string | RequestConfig): Promise<ProducerResult>;
  requestReply(
    bodyOrConfig: string | RequestConfig,
    timeout?: number,
  ): Promise<OperationResult>;
}

/**
 * Дескриптор результата операции Produce
 */
export interface ProducerResult extends OperationResult {
  address: string;
  receiveReply(timeout?: number): ValueOrPromise<OperationResult>;
}

export type ProducerResultHandler = (
  producerResult: ProducerResult,
) => ValueOrPromise<void>;

/**
 * Дескриптор результата операции Consume
 */
export interface ConsumerResult extends OperationResult {
  address: string;
  sendReply(
    bodyOrConfig?: string | RequestConfig,
  ): ValueOrPromise<OperationResult>;
}

export type ConsumerResultHandler = (consumerResult: ConsumerResult) => void;

/**
 * Интефейс Клиента (Producer), который обычно инъектируется по месту применения
 */
// export interface AmqbClient {
//   /**
//    * Создать Отправщик запросов
//    * @param config
//    */
//   createRequest(topicOrConfig?: string | RequestConfig): AmqbClientRequest;
//   /**
//    * Оправить запрос без ответа
//    */
//   notify(
//     requestBody: string,
//     correlationId?: string,
//   ): Promise<ProduceResult>;
//   /**
//    * Оправить запрос с ожиданием ответа
//    */
//   requestReply(requestBody: string): Promise<OperationResult>;
// }

/**
 * Обработчик фатальных ошибок
 */
export type ErrorHandler = (err?: any) => void;

/**
 * описатель события
 */
// export interface EventInfo {
//   statusText?: string,
//   [prop: string]: any,
// }
/**
 * подписка на событие
 */
// export type EventHandler = (message: string, data?: any) => void;

/**
 * События Сервера
 */
// export type ReceiverMessageFunction = (receiverContext: any) => ValueOrPromise<void>;
// export type AmqMessageFunction = (amqMessage: AmqMessage) => ValueOrPromise<void>;

/**
 * Интерфейс Сервера (Consumer)
 */
// export interface AmqbServer extends Server, Context {
//   init(options?: ConsumerOptions, receiverMessageFunction?: ReceiverMessageFunction): ValueOrPromise<void>;
//   start(): ValueOrPromise<void>;
//   stop(): ValueOrPromise<void>;
// }

/**
 * Фабрика - генератор серверов.
 * Используется, если их нужно более чем 1
 */
// export interface AmqbServerFactory {
//   createServer(
//     options: ConsumerOptions,
//     buildResponse?: BuildResponseFunction,
//   ): ValueOrPromise<AmqbServer>;
// }

/**
 * Запрос к серверу
 */
export interface AmqbServerRequest {
  incomingMessage: AmqMessage;
}

/**
 * Инструмент сервера для отправки ответа
 */
// export interface AmqbServerResponse {
//   send(body: string): Promise<ProducerResult>;
// }

/**
 * Контекст серверного запроса (RequestContext).
 * Изолированная среда исполнения потока (flow) Запроса
 * Создается автоматически при появлении сообщения в очереди запросов
 */
// export interface AmqbServerContext extends Context {
//   request: AmqbServerRequest;
//   response?: AmqbServerResponse;
// }

// export interface AmqbRequestContext extends Context {}

/**
 * Функция обратного вызова (callback) для получения серверного сообщения
 */
export type BuildResponseFunction = (
  requestBody: string,
) => ValueOrPromise<string | void>;

// export type ConsumeHandler = (consumeResult: ConsumeResult) => void;
/**
 * Шаблон сервиса для получения и обработки серверного запроса.
 * Этот сервис будет вызван автоматически, в Контексте запроса
 */
// export interface ResponseBuilder {
//   response?: AmqbServerResponse;
//   buildResponse?: BuildResponseFunction;
// }

/**
 * Технологические интерфейсы
 */
/**
 *
 */
export interface AmqBusLogAdapter {
  onConnect(ctx: any): void;
  onDisconnect(ctx: any): void;
  onProducerOpen(ctx: any): void;
  onProducerRequest(operationResult: OperationResult): void;
  onProducerResponse(operationResult: OperationResult): void;
  onConsumerOpen(ctx: any): void;
  onConsumerRequest(operationResult: OperationResult): void;
  onConsumerResponse(operationResult: OperationResult): void;
  onConnectionError(ctx: any): void;
  onSenderError(ctx: any): void;
  onReceiverError(ctx: any): void;
  onError(message: string, err: any): void;
  onReceiverMessage(ctx: any): void;
}

export interface AmqConnector {
  readonly config: any;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  createSender(options: string | SenderOptions): Sender;
  createReceiver(options: string | ReceiverOptions): Receiver;
}

export type ConnectionDetailsFunction = (
  conn_established_counter: number,
) => ConnectionDetails;

export type ReceiverContext = {
  message: Message;
};
