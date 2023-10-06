import { BindingScope, Context, inject, injectable } from "@loopback/core";
import { AmqBusBindings } from "../keys";
import {
  AmqBusRequest,
  AmqBusRequestContext,
  AmqBusResponse,
  Amqbus,
  ResponseBuilder,
} from "./types";

@injectable({ scope: BindingScope.REQUEST })
export class RequestContext
  extends Context
  implements AmqBusRequestContext, Amqbus.ConsumerContext
{
  request: AmqBusRequest;
  response?: AmqBusResponse;
  backout?: AmqBusResponse;

  constructor(
    @inject.context()
    parentContext: Context,
  ) {
    super(parentContext);
  }

  private async createRequest(incomingMessage: Amqbus.IncomingMessage) {
    const request = await this.get<Amqbus.Request>(
      AmqBusBindings.Consumer.REQUEST,
    );
    request.receive(incomingMessage);
    return request;
  }

  private async createResponse(onResponse: Amqbus.SendResponseFunction) {
    const response = await this.get<Amqbus.Response>(
      AmqBusBindings.Consumer.RESPONSE,
    );
    response.init(onResponse);

    return response;
  }

  protected async loadResponseBuilder(): Promise<ResponseBuilder> {
    return this.get(AmqBusBindings.Consumer.RESPONSE_BUILDER);
  }

  protected async buildResponse(incomingMessage: Amqbus.IncomingMessage) {
    return this.loadResponseBuilder().then((builder) =>
      builder.buildResponse(incomingMessage.data),
    );
  }

  async build(
    options: Amqbus.ConsumeOptions,
    incomingMessage: Amqbus.IncomingMessage,
    onResponse: Amqbus.SendResponseFunction,
  ) {
    this.bind(AmqBusBindings.Consumer.OPTIONS).to(options);

    this.request = await this.createRequest(incomingMessage);

    if (options.outputQueue) {
      this.response = await this.createResponse(onResponse);

      const body = await this.buildResponse(incomingMessage);
      if (body) {
        this.response?.send(body);
      }
      return;
    }
    await this.buildResponse(incomingMessage);
  }
}
