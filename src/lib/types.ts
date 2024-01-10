import { Context, ValueOrPromise } from "@loopback/core";
import { Receiver, ReceiverOptions, Sender, SenderOptions } from "rhea";
import { ServerContext } from "./server-context";

/**
 * Конфигурация подключения
 */
export interface ConnectorOptions {
  /**
   * tls | ssl
   */
  transport: string | undefined;
  /**
   * адрес сервера
   */
  host: string | undefined;
  port: string | number | undefined;
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

/**
 * Конфигурация клиентского запроса
 */
export interface AmqBusRequestConfig {
  /**
   * очередь запросов (куда отправлять)
   */
  topic?: string | undefined;
  /**
   * очердь ответов (начинает прослушиваться после отправки запроса)
   */
  replyTo?: string | undefined;
  /**
   * messageId - можно указать явно, иначе будет сгенерирован UUIDv4
   */
  messageId?: string | undefined;
  /**
   * correlationId - как правило, указывают для отправки ответа
   */
  correlationId?: string | undefined;
  /**
   * тело сообщения
   */
  body?: string | undefined;
  /**
   * лимит ожидания готовности транспорта (Producer), а так же ожидания ответа .
   * По умолчанию = 60000
   */
  timeout?: number | string | undefined;
}
/**
 * Настройки (шаблон) запроса можно скофигурировать как пресет, на этапе инициализации компонента
 */
export interface ProducerOptions extends AmqBusRequestConfig {}

/**
 * Конфигурация серверной части (Consumer)
 */
export interface ConsumerOptions {
  /**
   * очередь запросов, которую слушает Сервер
   */
  topic?: string | undefined;
  /**
   * очередь ответов
   */
  replyTo?: string | undefined;
  /**
   * лимит ожидания готовности транспорта (Producer) для  отправки ответа.
   * По умолчанию = 60000
   */
  timeout?: number | string | undefined;
}

/**
 * Интерфейс конфигурауции Компонента
 */
export interface AmqBusOptions {
  connector: ConnectorOptions;
  consumer?: ConsumerOptions;
  producer?: ProducerOptions;
}

/**
 * Дескриптор сообщения
 */
export interface AmqMessage {
  messageId?: string;
  correlationId?: string;
  data: string | null;
  created?: string;
}

/**
 * Формальный Статус операции отправки
 */
export enum ProduceMsgStatus {
  SUCCESS = "SUCCESS",
  CONFIG_ERROR = "CONFIG_ERROR",
  CONNECTION_ERROR = "CONNECTION_ERROR",
  SENDER_ERROR = "SENDER_ERROR",
  TIMED_OUT = "TIMED_OUT",
  UNKNOWN = "UNKNOWN",
}

/**
 * Формальный Статус операции получения
 */
export enum ConsumeMsgStatus {
  SUCCESS = "SUCCESS",
  CONFIG_ERROR = "CONFIG_ERROR",
  CONNECTION_ERROR = "CONNECTION_ERROR",
  RECEIVER_ERROR = "RECEIVER_ERROR",
  TIMED_OUT = "TIMED_OUT",
  NO_REPLY = "NO_REPLY",
}

/**
 * Дескриптор результата операции Получения
 */
export interface ConsumeMsgResult {
  status: ConsumeMsgStatus;
  address?: string;
  message?: AmqMessage;
  cause?: any; // Error
}

/**
 * Дескриптор результата операции Отправки
 */
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

/**
 * Интефейс Клиента (Producer), который обычно инъектируется по месту применения
 */
export interface AmqBusClient {
  /**
   * Создать конфиг запроса соединением настроек дефолтных и заданных
   */
  buildConfig(options?: ProducerOptions): AmqBusRequestConfig;
  /**
   * Создать Отправщик запросов
   */
  createRequest(options?: ProducerOptions): AmqBusClientRequest;
  /**
   * Оправить запрос без ответа
   */
  notify(
    requestBody: string,
    correlationId?: string,
  ): Promise<ProduceMsgResult>;
  /**
   * Оправить запрос с ожиданием ответа
   */
  requestReply(requestBody: string): Promise<ConsumeMsgResult>;
}

/**
 * Интефейс клиентского запроса
 */
export interface AmqBusClientRequest extends AmqBusRequestConfig {
  send(bodyOrConfig?: string | AmqBusRequestConfig): Promise<ProduceMsgResult>;
}

/**
 * Обработчик фатальных ошибок
 */
export type ErrorHandler = (err?: any) => void;
/**
 * События Сервера
 */
export type ReceiverMessageFunction = (
  receiverContext: any,
) => ValueOrPromise<void>;
export type AmqMessageFunction = (
  amqMessage: AmqMessage,
) => ValueOrPromise<void>;

/**
 * Интерфейс Сервера (Consumer)
 */
export interface AmqBusServer {
  start(): void;
  stop(): void;
}

/**
 * Фабрика - генератор серверов.
 * Используется, если их нужно более чем 1
 */
export interface AmqBusServerFactory {
  createServer(
    options: ConsumerOptions,
    buildResponse?: BuildResponseFunction,
  ): ValueOrPromise<AmqBusServer>;
}

/**
 * Запрос к серверу
 */
export interface AmqBusServerRequest {
  readonly topic: string;
  incomingMessage: AmqMessage;
}

/**
 * Инструмент сервера для отправки ответа
 */
export interface AmqBusServerResponse {
  send(body: string, topic?: string): Promise<ProduceMsgResult>;
}

/**
 * Контекст серверного запроса (RequestContext).
 * Изолированная среда исполнения потока (flow) Запроса
 * Создается автоматически при появлении сообщения в очереди запросов
 */
export interface AmqBusServerContext extends Context {
  request: AmqBusServerRequest;
  response?: AmqBusServerResponse;
}

/**
 * Генератор Контекстов серверного запроса
 */
export interface ServerContextFactory {
  createContext(options: ConsumerOptions): Promise<ServerContext>;
}

/**
 * Функция обратного вызова (callback) для получения серверного запроса
 */
export type BuildResponseFunction = (
  requestBody: string,
) => ValueOrPromise<string | void>;

/**
 * Шаблон сервиса для получения и обработки серверного запроса.
 * Этот сервис будет вызван автоматически, в Контексте запроса
 */
export interface ResponseBuilder {
  buildResponse?: BuildResponseFunction;
}

/**
 * Технологические интерфейсы
 */
/**
 *
 */
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

export interface AmqConnector {
  readonly config: any;
  connect(): Promise<void>;
  disconnect(): void;
  isConnected(): boolean;
  createSender(options: string | SenderOptions): Sender;
  createReceiver(options: string | ReceiverOptions): Receiver;
}
