import { ValueOrPromise, injectable } from "@loopback/core";
import { headersToString } from "./tools";
import { AmqBusLogAdapter, AmqMessage, OperationResult } from "./types";

const HIDDEN_ALTERNATE = "{*hidden}";
const EMPTY_ALTERNATE = "{*empty}";

export type LogAdapterOptions = {
  level?: string;
  showBody?: boolean | string;
  logInvocation?: boolean | string;
};

export interface ApiLogAdapter {
  options: LogAdapterOptions;
  level: string;
  sender: string;
  contextId?: string;
  requestId?: string;
  dataToString(data: any): string;
  onMessage(eventName: string, message: string, data?: string): void;
  info(eventName: string, message: string, args: object): void;
  http(eventName: string, message: string, args: object): void;
}

interface Metadata extends Omit<AmqMessage, "headers" | "data"> {
  headers?: string;
}

@injectable()
export class AmqbLogAdapter implements AmqBusLogAdapter {
  showContent = false;

  constructor(private apiLogAdapter?: ApiLogAdapter) {
    if (this.apiLogAdapter) {
      this.apiLogAdapter.sender = AmqbLogAdapter.name;
      const { showBody } = this.apiLogAdapter.options;
      this.showContent = showBody === true || showBody === "true";
    }
  }

  onConnectionError(ctx: any): ValueOrPromise<void> {
    const eventName = "AmqpConnectionError";
    const message = "AMQP Connector lost connection";
    this.apiLogAdapter?.info(eventName, message, { context: ctx });
  }

  public set sender(name: string) {
    this.apiLogAdapter.sender = name;
  }

  onConnect(metadata: any) {
    const eventName = "AmqBusConnected";
    const message = "AMQP Connector connected";
    const { ca, ...options } = metadata;
    const connection = {
      ...options,
      ca: ca && ca.toString().substring(0, 64) + " ...",
    };
    this.apiLogAdapter?.info(eventName, message, { connection: connection });
  }

  onDisconnect(metadata: object) {
    const eventName = "AmqBusDisconnected";
    const message = "AMQP Connector disconnected";
    this.apiLogAdapter?.info(eventName, message, { metadata: metadata });
  }

  onConsumerOpen(metadata: object) {
    const eventName = "JmsConsumerOpen";
    const message = "AMQP Consumer Open Success";
    this.apiLogAdapter?.info(eventName, message, { metadata: metadata });
  }

  onProducerOpen(metadata: any) {
    const eventName = "AmqpProducerOpen";
    const message = "AMQP Producer Open Success";
    this.apiLogAdapter?.info(eventName, message, { metadata: metadata });
  }

  protected printData(eventName: string, message: string, data: any) {
    let result = (data ?? EMPTY_ALTERNATE) || EMPTY_ALTERNATE;
    result = this.showContent
      ? this.apiLogAdapter.dataToString(data)
      : HIDDEN_ALTERNATE;
    this.apiLogAdapter?.onMessage(eventName, message, result);
  }
  protected async printMetaData(
    eventName: string,
    message: string,
    metadata: object,
  ) {
    this.apiLogAdapter?.info(eventName, message, metadata);
  }

  private formatMessage(message?: AmqMessage) {
    if (message) {
      const { data, headers, ...md } = message;
      const metadata: Metadata = {
        ...md,
        headers: headers && headersToString(headers),
      };
      return {
        metadata,
        data,
      };
    }
  }

  private formatError(err?: any) {
    if (err) {
      const { name, message, stack } = err;
      return {
        name,
        message,
        stack,
      };
    }
  }

  onConsumerRequest(operationResult: OperationResult) {
    const eventName = "JmsConsumerRequest";
    const baseMessage = "Consumer request";

    const { message, cause, ...result } = operationResult;
    const msg = this.formatMessage(message);
    const err = this.formatError(cause);
    const metadata = {
      ...result,
      ...msg?.metadata,
      cause: err,
    };
    this.printMetaData(eventName, `${baseMessage} RECEIVED`, metadata);
    if (msg) {
      this.printData(eventName, `${baseMessage} BODY`, msg.data);
    }
  }

  onConsumerResponse(operationResult: OperationResult) {
    const eventName = "JmsConsumerResponse";
    const baseMessage = "Consumer request response";

    const { message, cause, ...result } = operationResult;
    const msg = this.formatMessage(message);
    const err = this.formatError(cause);
    const metadata = {
      ...result,
      ...msg?.metadata,
      case: err,
    };

    this.printMetaData(eventName, `${baseMessage} SENT`, metadata);
    if (msg) {
      this.printData(eventName, `${baseMessage} BODY`, msg.data);
    }
  }

  onProducerRequest(operationResult: OperationResult) {
    const eventName = "JmsProducerRequest";
    const baseMessage = "Producer request";

    const { message, cause, ...result } = operationResult;
    const msg = this.formatMessage(message);
    const err = this.formatError(cause);
    const metadata = {
      ...result,
      ...msg?.metadata,
      case: err,
    };

    this.printMetaData(eventName, `${baseMessage} SENT`, metadata);
    if (msg) {
      this.printData(eventName, `${baseMessage} BODY`, msg.data);
    }
  }

  onProducerResponse(operationResult: OperationResult) {
    const eventName = "JmsProducerResponse";
    const baseMessage = "Producer request response";

    const { message, cause, ...result } = operationResult;
    const msg = this.formatMessage(message);
    const err = this.formatError(cause);
    const metadata = {
      ...result,
      ...msg?.metadata,
      case: err,
    };

    this.printMetaData(eventName, `${baseMessage} RECEIVED`, metadata);
    if (msg) {
      this.printData(eventName, `${baseMessage} BODY`, msg.data);
    }
  }

  onError(message: string, err: any) {
    const eventName = "JmsCommonError";
    const error_description = {
      cause: err.message,
      stack: err.stack,
    };
    this.printMetaData(eventName, message, { error_description });
  }

  onSenderError(ctx: any): ValueOrPromise<void> {
    const eventName = "JmsSenderError";

    if (typeof ctx === "string") {
      const message = ctx;
      const error_description = {
        cause: ctx,
      };
      this.printMetaData(eventName, message, { error_description });
    } else {
      const message = ctx.message;
      const error_description = {
        cause: ctx.message,
        stack: ctx.stack,
      };
      this.printMetaData(eventName, message, { error_description });
    }
  }

  onReceiverError(ctx: any): ValueOrPromise<void> {
    const eventName = "JmsReceiverError";

    if (typeof ctx === "string") {
      const message = ctx;
      const error_description = {
        cause: ctx,
      };
      this.printMetaData(eventName, message, { error_description });
    } else {
      const message = ctx.message;
      const error_description = {
        cause: ctx.message,
        stack: ctx.stack,
      };
      this.printMetaData(eventName, message, { error_description });
    }
  }

  onReceiverMessage(ctx: any) {
    const eventName = "JmsProducerReceiverMessage";
    const baseMessage = "Producer Reply Receiver message";

    this.apiLogAdapter?.info(
      eventName,
      `${baseMessage} RECEIVED`,
      ctx as object,
    );
  }
}
