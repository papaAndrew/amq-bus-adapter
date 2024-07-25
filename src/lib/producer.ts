import { ValueOrPromise } from "@loopback/core";
import { Message, Receiver } from "rhea";
import { Corresponder } from "./corresponder";
import { buildRequest, rheaToAmqMessage, waitFor } from "./tools";
import {
  AmqBusLogAdapter,
  AmqMessage,
  ErrorHandler,
  OperationResult,
  OperationStatus,
  Pluggable,
  ProducerResult,
  RequestConfig,
  RouteOptions,
} from "./types";

export const SENDABLE_TIMEOUT = 60000;

export const SENDABLE_CHECK_INTERVAL = 3;

export const REPLY_TIMEOUT = 60000;

export const REPLY_CHECK_INTERVAL = 3;

export class Producer extends Corresponder implements Pluggable {
  private queue: Record<string, AmqMessage | null> = {};

  private errorHandler?: ErrorHandler;

  public setErrorHandler(errorHandler: ErrorHandler) {
    this.errorHandler = errorHandler;
  }

  private logAdapter?: AmqBusLogAdapter;

  public setLogAdapter(logAdapter: AmqBusLogAdapter) {
    this.logAdapter = logAdapter;
  }

  public getReceiverAddress(): string {
    return this.replyTo;
  }
  public getSenderAddress(): string {
    return this.address;
  }

  public connectionError(ctx: any): void {
    this.logAdapter?.onConnectionError(ctx);
    this.errorHandler?.(ctx);
  }
  public receiverError(ctx: any): void {
    this.logAdapter?.onReceiverError(ctx);
  }

  public senderError(ctx: any) {
    this.logAdapter?.onSenderError(ctx);
  }

  public receiverMessage(ctx: any) {
    const amqMessage = rheaToAmqMessage<AmqMessage>(ctx.message);
    this.logAdapter?.onReceiverMessage({
      address: this.replyTo,
      context: amqMessage,
    });

    try {
      this.queCheckExits(amqMessage.correlationId);
    } catch {
      return;
    }

    this.queResponse(amqMessage);
  }

  private queRequest(correlationId: string) {
    if (correlationId in this.queue) {
      throw new Error(`Duplicate request`);
    }
    this.queue[correlationId] = null;
  }

  private queCheckExits(correlationId?: string) {
    if (!correlationId) {
      throw new Error(`Correlation rule is not defined`);
    }
    if (!(correlationId in this.queue)) {
      throw new Error(`Correlated request [${correlationId}] not found`);
    }

    // await waitFor(3000, 100, () => (correlationId in this.queue))
    //   .catch(() => {
    //     throw new Error(`Correlated request [${correlationId}] not found`);
    //   })
  }

  /**
   *
   * @param err error or null
   * @param response consumed message or correlationId if error
   */
  private queResponse(response: AmqMessage) {
    const correlationId = response.correlationId;
    if (this.queue[correlationId] === null) {
      this.queue[correlationId] = response;
    } else if (correlationId in this.queue) {
      throw new Error(`Duplicate response`);
    }
  }

  private queRemove(correlationId: string) {
    const newQueue = Object.entries(this.queue)
      .filter(([k, v]) => k !== correlationId)
      .reduce((prev, [k, v]) => {
        return Object.assign(prev, {
          [k]: v,
        });
      }, {});

    this.queue = newQueue;
  }

  protected getReceiverError() {
    return (receiver: any) => {
      const { error } = receiver as Receiver;
      this.receiverError(
        error ?? new Error(`Jms Producer Reply Receiver Connection Failed`),
      );
    };
  }

  public async send(
    bodyOrRequest: string | RequestConfig,
  ): Promise<ProducerResult> {
    const requestConfig = buildRequest(bodyOrRequest);
    const result = this.sendRequest(requestConfig).then((sent) => {
      this.logAdapter?.onProducerRequest(sent);
      return sent;
    });

    return result;
  }

  public async requestReply(
    bodyOrRequest: string | RequestConfig,
    timeout?: number,
  ): Promise<OperationResult> {
    return this.send(bodyOrRequest).then((produced) => {
      if (produced.status === OperationStatus.SUCCESS) {
        return produced.receiveReply(timeout);
      }
      return produced;
    });
  }

  protected async sendRequest(
    requestConfig: RequestConfig,
  ): Promise<ProducerResult> {
    const sender = this._sender;
    if (!sender) {
      const result: ProducerResult = {
        status: OperationStatus.CONFIG_ERROR,
        statusText: "Jms Producer Sender not opened",
        address: this.address,
        receiveReply: this.getReceiveReply(),
      };
      return result;
    }
    const result: ProducerResult = {
      status: OperationStatus.SUCCESS,
      statusText: "Jms Request Produced",
      address: this.address,
      receiveReply: this.getReceiveReply(requestConfig),
    };

    const { correlationId, body } = requestConfig;
    const message: Message = {
      body,
      creation_time: new Date(),
      correlation_id: correlationId,
    };
    const delivery = sender.send(message);

    if (delivery) {
      result.message = rheaToAmqMessage(message);
    } else {
      result.status = OperationStatus.OPERATION_ERROR;
      result.cause = new Error(`Message delivery failed`);
    }
    return result;
  }

  private getReceiveReply(requestConfig?: RequestConfig) {
    const address = this.replyTo;
    if (!address) {
      return () => {
        const statusText = `ReplyTo not defined`;
        const result: OperationResult = {
          address,
          status: OperationStatus.CONFIG_ERROR,
          cause: new Error(statusText),
          statusText,
        };
        return result;
      };
    }
    if (!requestConfig) {
      return () => {
        const statusText = `No request, no reply`;
        const result: OperationResult = {
          address,
          status: OperationStatus.CONFIG_ERROR,
          cause: new Error(statusText),
          statusText,
        };
        return result;
      };
    }
    const { correlationId, timeout: cfgTimeout } = requestConfig;
    if (!correlationId) {
      return () => {
        const statusText = `Correlation rule is not defined`;
        const result: OperationResult = {
          address: this.replyTo,
          status: OperationStatus.OPERATION_ERROR,
          cause: new Error(statusText),
          statusText,
        };
        return result;
      };
    }
    const presetTimeout = cfgTimeout ? Number(cfgTimeout) : REPLY_TIMEOUT;

    return (timeout?: number) =>
      this.receiveReply(correlationId, timeout ?? presetTimeout);
  }

  private receiveReply(
    correlationId: string,
    timeout: number,
  ): ValueOrPromise<OperationResult> {
    this.queRequest(correlationId);

    const result: OperationResult = {
      status: OperationStatus.SUCCESS,
      address: this.replyTo,
    };

    return waitFor<AmqMessage>(
      timeout,
      REPLY_CHECK_INTERVAL,
      () => this.queue[correlationId],
    )
      .then((response) => {
        result.message = response;
        this.logAdapter?.onProducerResponse(result);
        return result;
      })
      .catch((err) => {
        result.status = OperationStatus.TIMED_OUT;
        result.statusText = err.message;
        result.cause = err;
        return result;
      })
      .finally(() => {
        this.queRemove(correlationId);
      });
  }

  async open(opions: RouteOptions): Promise<void> {
    await super.open(opions);
    if (this.isOpen()) {
      this.logAdapter?.onProducerOpen(this.getSenderOptions());
    }
  }

  public isOpen(): boolean {
    return !!this._sender?.is_open();
  }
}
