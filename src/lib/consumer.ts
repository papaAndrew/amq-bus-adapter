import { Corresponder } from "./corresponder";
import { requestToMessage, rheaToAmqMessage } from "./tools";
import {
  AmqBusLogAdapter,
  ConsumerResult,
  ConsumerResultHandler,
  ErrorHandler,
  OperationResult,
  OperationStatus,
  Pluggable,
  ReceiverContext,
  RequestConfig,
  RouteOptions,
} from "./types";

export class Consumer extends Corresponder implements Pluggable {
  private _errorHandler?: ErrorHandler;

  public setErrorHandler(errorHandler: ErrorHandler) {
    this._errorHandler = errorHandler;
  }

  private logAdapter?: AmqBusLogAdapter;

  public setLogAdapter(logAdapter: AmqBusLogAdapter) {
    this.logAdapter = logAdapter;
  }

  private consumerResultHandler?: ConsumerResultHandler;

  public setConsumerResultHandler(
    consumerResultHandler: ConsumerResultHandler,
  ) {
    this.consumerResultHandler = consumerResultHandler;
  }

  public getReceiverAddress(): string {
    return this.address;
  }
  public getSenderAddress(): string {
    return this.replyTo;
  }

  public connectionError(ctx: any): void {
    this._errorHandler?.(ctx);
  }

  senderError(ctx: any) {
    this.logAdapter?.onSenderError(ctx);
  }

  protected async sendReply(
    bodyOrConfig: string | RequestConfig,
  ): Promise<OperationResult> {
    const operationResult: OperationResult = {
      status: OperationStatus.SUCCESS,
      address: this.replyTo,
    };

    const message = requestToMessage(bodyOrConfig);

    const delivery: any = this._sender?.send(message);
    if (delivery?.data) {
      message.body = Buffer.from(delivery.data).toString();
      operationResult.message = rheaToAmqMessage(message);
    } else {
      const statusText = "Consumer Send Reply Error";
      operationResult.status = OperationStatus.CONFIG_ERROR;
      operationResult.statusText = statusText;
      operationResult.cause = new Error(statusText);
    }
    this.logAdapter?.onConsumerResponse(operationResult);

    return operationResult;
  }

  private async consumerResquestReceived(consumerResult: ConsumerResult) {
    this.logAdapter?.onConsumerRequest(consumerResult);

    this.consumerResultHandler?.(consumerResult);
  }

  async receiverMessage(ctx: ReceiverContext) {
    const amqMessage = rheaToAmqMessage(ctx.message);
    this.logAdapter?.onReceiverMessage(amqMessage);

    const consumerResult: ConsumerResult = {
      status: OperationStatus.SUCCESS,
      address: this.address,
      message: amqMessage,
      sendReply: this.sendReply.bind(this),
    };
    await this.consumerResquestReceived(consumerResult);
  }

  receiverError(ctx: any) {
    const err = this._receiver.error as any;
    const statusText =
      err.description ?? err.message ?? `Jms Consumer Receiver Error`;
    this.logAdapter?.onReceiverError(new Error(statusText));

    const consumerResult: ConsumerResult = {
      status: OperationStatus.OPERATION_ERROR,
      statusText,
      address: this.address,
      sendReply: this.sendReply.bind(this),
      cause: err,
    };
    this.consumerResquestReceived(consumerResult);
  }

  async open(opions: RouteOptions): Promise<void> {
    await super.open(opions);
    if (this.isOpen()) {
      this.logAdapter?.onConsumerOpen(this.getReceiverOptions());
    }
  }

  public isOpen(): boolean {
    return !!this._receiver?.is_open();
  }
}
