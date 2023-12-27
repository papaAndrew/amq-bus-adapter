import { injectable } from "@loopback/core";
import { Delivery, Message, Sender, SenderOptions } from "rhea";
import { genUuid4, nowLocaleTime, rheaToAmqMessage, waitFor } from "./tools";
import {
  AmqBusLogAdapter,
  AmqBusRequestConfig,
  AmqBusServerResponse,
  AmqConnector,
  AmqMessage,
  BuildResponseFunction,
  ConsumerOptions,
  ProduceMsgResult,
  ProduceMsgStatus,
} from "./types";

const DEFAULT_INTERVAL = 1;
const DEFAULT_TIMEOUT = 30000;

@injectable()
export class ServerResponse implements AmqBusServerResponse {
  private _outcomingMessage?: AmqMessage;

  // private _correlationId?: string;

  constructor(
    private loqAdapter: AmqBusLogAdapter,
    private connector: AmqConnector,
    readonly options: ConsumerOptions,
    private buildResponse?: BuildResponseFunction,
  ) {}

  async produce(incomingMessage: AmqMessage) {
    this._outcomingMessage = {
      messageId: genUuid4(),
      correlationId: incomingMessage.messageId,
      data: null,
      created: nowLocaleTime(),
    };
    const { buildResponse } = this;
    const requestBody = incomingMessage.data;
    const resposeBody = await buildResponse?.(requestBody);
    if (this._outcomingMessage.data) {
      return;
    }
    if (resposeBody) {
      this.send(resposeBody);
    }
  }

  private createSender(topic: string): Sender | undefined {
    const senderOptions: SenderOptions = {
      target: topic,
    };
    return this.connector.createSender(senderOptions);
  }

  private async sendMessage(
    sender: Sender,
    message: Message,
    timeout: number,
  ): Promise<Delivery> {
    const result: {
      delivery?: any;
      hasError: boolean;
    } = {
      hasError: false,
    };

    sender.on("sendable", () => {
      result.delivery = sender.send(message);
    });

    sender.on("sender_error", (context) => {
      result.hasError = true;
      result.delivery = context.error ?? `Event 'sender_error' occured`;
    });

    return waitFor<boolean>(timeout, DEFAULT_INTERVAL, () => {
      return !!result.delivery;
    }).then(() => {
      if (result.hasError) {
        throw new Error(result.delivery);
      }
      return result.delivery as Delivery;
    });
  }

  private buildRequest(
    body: string,
    queue?: string,
    timeout?: number,
  ): AmqBusRequestConfig {
    const { replyTo, timeout: baseTimeout } = this.options ?? {};
    const { messageId, correlationId } = this._outcomingMessage;

    const config: AmqBusRequestConfig = {
      body,
      topic: queue ?? replyTo,
      correlationId,
      messageId,
      timeout: timeout ?? baseTimeout,
    };
    if (!config.topic) {
      throw new Error(`Reply queue is not defined`);
    }
    return config;
  }

  async send(data: string, address?: string): Promise<ProduceMsgResult> {
    const result: ProduceMsgResult = {
      status: ProduceMsgStatus.UNKNOWN,
    };
    let config: AmqBusRequestConfig | undefined;
    try {
      config = this.buildRequest(data, address);
    } catch (err) {
      result.status = ProduceMsgStatus.CONFIG_ERROR;
      result.cause = err;
      return result;
    }

    const { correlationId, topic, body, messageId, timeout } = config;
    result.address = topic;

    let sender: Sender | undefined;
    try {
      sender = this.createSender(topic);
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

    const timeoutProduce = timeout ? Number(timeout) : DEFAULT_TIMEOUT;
    await this.sendMessage(sender, message, timeoutProduce)
      .then(() => {
        result.status = ProduceMsgStatus.SUCCESS;
        result.message = rheaToAmqMessage(message);
      })
      .catch((err) => {
        result.status = ProduceMsgStatus.SENDER_ERROR;
        result.cause = err;
      })
      .finally(() => {
        sender.close();
      });

    this._outcomingMessage.data = body;
    this.loqAdapter.onServerResponse(result);
    return result;
  }
}
