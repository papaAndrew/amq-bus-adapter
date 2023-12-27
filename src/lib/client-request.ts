import { Message, Receiver, ReceiverOptions, Sender, filter } from "rhea";
import { genUuid4, rheaToAmqMessage, waitFor } from "./tools";
import {
  AmqBusClientRequest,
  AmqBusLogAdapter,
  AmqBusRequestConfig,
  AmqConnector,
  AmqMessage,
  ConsumeMsgResult,
  ConsumeMsgStatus,
  ProduceMsgResult,
  ProduceMsgStatus,
} from "./types";

/**
 * Timeout awaiting Producer "sendable", and awaiting response too
 */
const DEFAULT_TIMEOUT = 60000;
/**
 * Response polling interval
 */
const DEFAULT_INTERVAL = 1;

export class ClientRequest implements AmqBusClientRequest {
  topic?: string;

  body?: string;

  messageId?: string;

  correlationId?: string;

  timeout: number = DEFAULT_TIMEOUT;

  replyTo?: string;

  constructor(
    private logAdapter: AmqBusLogAdapter,
    private connector: AmqConnector,
    readonly requestConfig?: AmqBusRequestConfig,
  ) {
    if (requestConfig) {
      const { topic, body, correlationId, messageId, replyTo, timeout } =
        requestConfig ?? {};

      this.topic = topic;
      this.replyTo = replyTo;
      this.body = body;
      this.messageId = messageId;
      this.correlationId = correlationId;
      this.timeout = timeout ? Number(timeout) : DEFAULT_TIMEOUT;
    }
  }

  private getTopic(givenTopic?: string): string {
    const result = givenTopic ?? this.topic;
    if (result) {
      return result;
    }
    throw new Error(`Request queue not specified`);
  }

  private getMessageId(givenMessageId?: string): string {
    const result = givenMessageId ?? this.messageId ?? genUuid4();
    return result;
  }

  private getBody(givenBody?: string): string {
    const result = givenBody ?? this.body;
    if (result) {
      return result;
    }
    throw new Error(`Message body not specified`);
  }

  private getReplyTo(givenReplyTo?: string): string {
    const result = givenReplyTo ?? this.replyTo;
    if (result) {
      return result;
    }
    throw new Error(`Reply address not specified`);
  }

  private getTimeOut(givenTimeOut?: string | number): number {
    const result = givenTimeOut ? Number(givenTimeOut) : this.timeout;
    return result;
  }

  private buildRequest(requestConfig?: AmqBusRequestConfig) {
    const { correlationId, timeout, topic, body, messageId, replyTo } =
      requestConfig ?? {};

    const request: AmqBusRequestConfig = {
      topic: this.getTopic(topic),
      body: this.getBody(body),
      messageId: this.getMessageId(messageId),
      correlationId: correlationId ?? this.correlationId,
      replyTo: replyTo ?? this.replyTo,
      timeout: this.getTimeOut(timeout),
    };
    return request;
  }

  async send(
    bodyOrConfig?: string | AmqBusRequestConfig,
  ): Promise<ProduceMsgResult> {
    const result: ProduceMsgResult = {
      status: ProduceMsgStatus.UNKNOWN,
      receiveResponse: async () => {
        return {
          status: ConsumeMsgStatus.NO_REPLY,
        };
      },
    };
    const requestConfig: AmqBusRequestConfig =
      typeof bodyOrConfig === "string" ? { body: bodyOrConfig } : bodyOrConfig;

    let config: AmqBusRequestConfig | undefined;
    try {
      config = this.buildRequest(requestConfig);
    } catch (err) {
      result.status = ProduceMsgStatus.CONFIG_ERROR;
      result.cause = err;
      return result;
    }

    const { correlationId, topic, body, messageId } = config;
    result.address = topic;

    let sender: Sender | undefined;
    try {
      sender = this.connector.createSender(topic);
    } catch (err) {
      (result.status = ProduceMsgStatus.CONNECTION_ERROR), (result.cause = err);
      return result;
    }

    const message: Message = {
      body: body,
      message_id: messageId,
      correlation_id: correlationId,
      creation_time: new Date(),
    };

    sender.on("sendable", () => {
      const delivery = sender.send(message);

      if (delivery) {
        result.status = ProduceMsgStatus.SUCCESS;
        result.message = rheaToAmqMessage(message);
        result.receiveResponse = (options?: {
          address?: string;
          timeout?: number;
        }) => {
          const { address, timeout: replyTimeout } = options ?? {};
          return this.receiveResponse(messageId, address, replyTimeout);
        };
      }
    });

    sender.on("sender_error", (context) => {
      result.status = ProduceMsgStatus.SENDER_ERROR;
      result.cause =
        context.error ?? new Error(`Sender 'sender_error' event occured`);
    });

    const requestTimeout = this.getTimeOut(config.timeout);
    await waitFor<boolean>(requestTimeout, DEFAULT_INTERVAL, () => {
      return result.status !== ProduceMsgStatus.UNKNOWN;
    })
      .catch((err) => {
        result.status = ProduceMsgStatus.TIMED_OUT;
        result.cause = err;
      })
      .finally(() => {
        sender.close();
      });

    this.logAdapter.onClientRequest(result);
    return result;
  }

  private async receiveResponse(
    correlationId: string,
    topic?: string,
    timeout?: number,
  ): Promise<ConsumeMsgResult> {
    const replyTo = this.getReplyTo(topic);
    const result: ConsumeMsgResult = {
      status: ConsumeMsgStatus.TIMED_OUT,
      address: replyTo,
    };
    const receiverOptions: ReceiverOptions = {
      source: {
        address: replyTo,
        filter: filter.selector(`JMSCorrelationID='${correlationId}'`),
      },
    };
    let receiver: Receiver | undefined;
    try {
      receiver = this.connector.createReceiver(receiverOptions);
    } catch (err) {
      result.status = ConsumeMsgStatus.CONNECTION_ERROR;
      result.cause = err;
      return result;
    }

    receiver.on("message", (context) => {
      result.status = ConsumeMsgStatus.SUCCESS;
      result.message = rheaToAmqMessage<AmqMessage>(context.message as Message);
    });

    receiver.on("receiver_error", ({ receiver }) => {
      result.status = ConsumeMsgStatus.RECEIVER_ERROR;
      result.cause =
        receiver.error ?? new Error(`Receiver 'receiver_error' event occured`);
    });

    const during = this.getTimeOut(timeout);
    await waitFor(
      during,
      DEFAULT_INTERVAL,
      () => result.status !== ConsumeMsgStatus.TIMED_OUT,
    )
      .catch((err) => {
        result.status = ConsumeMsgStatus.TIMED_OUT;
        result.cause = err;
      })
      .finally(() => {
        receiver.close();
      });

    this.logAdapter.onClientResponse(result);
    return result;
  }
}
