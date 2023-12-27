import { injectable } from "@loopback/core";
import {
  AmqBusLogAdapter,
  AmqMessage,
  ConsumeMsgResult,
  ProduceMsgResult,
} from "./types";

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
  onConnect(metadata: any) {
    const eventName = "AmqBusConnected";
    const message = "AMQ Connector connected";
    const { ca, ...options } = metadata;
    const connection = {
      ...options,
      ca: ca && ca.toString().substring(0, 64) + " ...",
    };
    this.apiLogAdapter?.info(eventName, message, { connection });
  }

  onDisconnect(metadata: object) {
    const eventName = "AmqBusDisconnected";
    const message = "AMQ Connector disconnected";
    this.apiLogAdapter?.info(eventName, message, { metadata });
  }

  onConsumerOpen(metadata: object) {
    const eventName = "AmqConsumerOpen";
    const message = "AMQ Consumer opened";
    this.apiLogAdapter?.info(eventName, message, { metadata });
  }

  protected printData(eventName: string, message: string, data: any) {
    if (this.apiLogAdapter) {
      let result = (data ?? EMPTY_ALTERNATE) || EMPTY_ALTERNATE;
      result = this.showContent
        ? this.apiLogAdapter.dataToString(data)
        : HIDDEN_ALTERNATE;
      this.apiLogAdapter.onMessage(eventName, message, result);
    }
  }
  protected async printMetaData(
    eventName: string,
    message: string,
    metadata: object,
  ) {
    if (this.apiLogAdapter) {
      this.apiLogAdapter.info(eventName, message, metadata);
    }
  }

  trapMessage(message?: AmqMessage) {
    if (message) {
      const { data, ...metadata } = message;
      return {
        metadata,
        data,
      };
    }
  }

  trapError(err?: any) {
    if (err) {
      const { name, message, stack } = err;
      return {
        name,
        message,
        stack,
      };
    }
  }

  onServerRequest(consumeMsgResult: ConsumeMsgResult) {
    const eventName = "AmqBusServerRequest";
    const baseMessage = "Server request";

    const { message, cause, ...result } = consumeMsgResult;
    const msg = this.trapMessage(message);
    const err = this.trapError(cause);
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

  onServerResponse(produceMsgResult: ProduceMsgResult) {
    const eventName = "AmqBusServerResponse";
    const baseMessage = "Server request response";

    const { message, cause, ...result } = produceMsgResult;
    const msg = this.trapMessage(message);
    const err = this.trapError(cause);
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

  onClientRequest(produceMsgResult: ProduceMsgResult) {
    const eventName = "AmqBusClientRequest";
    const baseMessage = "Client request";

    const { message, cause, ...result } = produceMsgResult;
    const msg = this.trapMessage(message);
    const err = this.trapError(cause);
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

  onClientResponse(consumeMsgResult: ConsumeMsgResult) {
    const eventName = "AmqBusClientResponse";
    const baseMessage = "Client request response";

    const { message, cause, ...result } = consumeMsgResult;
    const msg = this.trapMessage(message);
    const err = this.trapError(cause);
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
    const eventName = "AmqBusError";
    const error_description = {
      cause: err.message,
      stack: err.stack,
    };
    this.printMetaData(eventName, message, { error_description });
  }
}
