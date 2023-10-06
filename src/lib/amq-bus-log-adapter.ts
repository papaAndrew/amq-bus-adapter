import { BindingScope, injectable } from "@loopback/core";
import {
  AmqBusRouteOptions,
  AmqConnectorOptions,
  AmqLogAdapter,
  AmqMessage,
} from "../lib";

const HIDDEN_ALTERNATE = "{*hidden}";
const EMPTY_ALTERNATE = "{*empty}";

export interface ApiLogAdapter {
  logMode: string;
  level: string;
  sender: string;
  contextId?: string;
  requestId?: string;
  dataToString(data: any): string;
  onMessage(eventName: string, message: string, data?: string): void;
  info(eventName: string, message: string, args: object): void;
  http(eventName: string, message: string, args: object): void;
}

@injectable({
  scope: BindingScope.TRANSIENT,
})
export class AmqBusLogAdapter implements AmqLogAdapter {
  showContent = false;

  constructor(private apiLogAdapter?: ApiLogAdapter) {
    if (this.apiLogAdapter) {
      this.apiLogAdapter.sender = AmqBusLogAdapter.name;
      this.apiLogAdapter.level = "http";
      this.showContent = this.apiLogAdapter.logMode === "content";
    }
  }
  onConnect(metadata: object) {
    const eventName = "AmqBusConnected";
    const message = "AMQ Connector connected";
    const { ca, ...config } = (<any>metadata)
      .connectionOptions as AmqConnectorOptions;
    this.apiLogAdapter?.info(eventName, message, { config });
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
      this.apiLogAdapter?.http(eventName, message, metadata);
    }
  }

  protected toMetaData(options: AmqBusRouteOptions, message: AmqMessage) {
    const { messageId, correlationId } = message;
    const request = {
      ...options,
      messageId,
      correlationId,
    };
    return request;
  }

  onConsumerRequest(options: AmqBusRouteOptions, message: AmqMessage) {
    const eventName = "AmqConsumerRequest";
    const baseMessage = "Incoming AMQ request";

    const request = this.toMetaData(options, message);
    this.printMetaData(eventName, `${baseMessage} RECIEVED`, { request });

    const { data } = message ?? {};
    this.printData(eventName, `${baseMessage} BODY`, data);
  }

  onConsumerResponse(options: AmqBusRouteOptions, message: AmqMessage) {
    const eventName = "AmqBusConsumerResponse";
    const baseMessage = "Incoming AMQ request response";

    const response = this.toMetaData(options, message);
    this.printMetaData(eventName, `${baseMessage} REPLY`, { response });

    const { data } = message ?? {};
    this.printData(eventName, `${baseMessage} BODY`, data);
  }

  onConsumerBackout(options: AmqBusRouteOptions, message: AmqMessage) {
    const eventName = "MqiBusConsumerBackout";
    const baseMessage = "Incoming AMQ request backout";

    const backout = this.toMetaData(options, message);
    this.printMetaData(eventName, `${baseMessage} REPLY`, { backout });

    const { data } = message ?? {};
    this.printData(eventName, `${baseMessage} BODY`, data);
  }

  onProducerRequest(options: AmqBusRouteOptions, message: AmqMessage) {
    const eventName = "AmqProducerRequest";
    const baseMessage = "Outcoming AMQ request";

    const request = this.toMetaData(options, message);
    this.printMetaData(eventName, `${baseMessage} SENT`, { request });

    const { data } = message ?? {};
    this.printData(eventName, `${baseMessage} BODY`, data);
  }

  onProducerResponse(options: AmqBusRouteOptions, message: AmqMessage) {
    const eventName = "AmqProducerResponse";
    const baseMessage = "Outcoming AMQ request response";

    const response = this.toMetaData(options, message);
    this.printMetaData(eventName, `${baseMessage} RECEIVED`, { response });

    const { data } = message ?? {};
    this.printData(eventName, `${baseMessage} BODY`, data);
  }

  onError(message: string, err: any) {
    const eventName = "MqiBusError";
    const error_description = {
      cause: err.message,
      stack: err.stack,
    };
    this.printMetaData(eventName, message, { error_description });
  }
}
