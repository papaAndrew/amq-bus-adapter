import { Context } from "@loopback/core";
import {
  AmqBusLogAdapter,
  AmqBusServerFactory,
  AmqConnector,
  BuildResponseFunction,
  ConsumerOptions,
  ErrorHandler,
  ResponseBuilder,
} from "../lib/types";
import { ConsumerServer } from "./consumer-server";
import { ServerContext } from "./server-context";
import { ServerRequest } from "./server-request";
import { ServerResponse } from "./server-response";

export class ConsumerServerFactory implements AmqBusServerFactory {
  constructor(
    private logAdapter: AmqBusLogAdapter,
    private connector: AmqConnector,
    private errorHandler: ErrorHandler,
    private responseBuilder?: ResponseBuilder,
    private parentContext?: Context,
  ) {}

  private createRequest(topic: string): ServerRequest {
    const request = new ServerRequest(this.logAdapter, topic);
    return request;
  }
  private createResponse(
    options: ConsumerOptions,
    buildResponse?: BuildResponseFunction,
  ): ServerResponse {
    const request = new ServerResponse(
      this.logAdapter,
      this.connector,
      options,
      buildResponse,
    );
    return request;
  }

  private createContext(
    request: ServerRequest,
    response: ServerResponse,
  ): ServerContext {
    const context = new ServerContext(request, response, this.parentContext);
    return context;
  }

  createServer(
    options: ConsumerOptions,
    buildResponse?: BuildResponseFunction,
  ): ConsumerServer {
    const { connector, errorHandler, responseBuilder } = this;

    const { topic } = options;
    if (topic) {
      const worker =
        buildResponse ?? responseBuilder?.buildResponse?.bind(responseBuilder);

      const request = this.createRequest(topic);
      const response = this.createResponse(options, worker);

      const context = this.createContext(request, response);
      const onMessage = context.onReceiverMessage.bind(context);

      const server = new ConsumerServer(
        connector,
        onMessage,
        errorHandler,
        options,
      );
      return server;
    }
    throw new Error(`Topic is not defined`);
  }
}
