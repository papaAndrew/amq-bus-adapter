import { BindingScope, Context } from "@loopback/core";
import { Message } from "rhea";
import { AmqBusBindings } from "./keys";
import { ServerRequest } from "./server-request";
import { ServerResponse } from "./server-response";
import {
  AmqBusServerContext,
  AmqBusServerRequest,
  AmqBusServerResponse,
} from "./types";

export class ServerContext extends Context implements AmqBusServerContext {
  // backout?: AmqBusResponse;

  constructor(
    private _request: ServerRequest,
    private _response: ServerResponse,
    parentContext?: Context,
  ) {
    super(parentContext);

    this.bind(AmqBusBindings.Server.CONTEXT)
      .to(this)
      .inScope(BindingScope.REQUEST);

    this.bind(AmqBusBindings.Server.REQUEST)
      .to(this._request)
      .inScope(BindingScope.REQUEST);

    this.bind(AmqBusBindings.Server.RESPONSE)
      .to(this._response)
      .inScope(BindingScope.REQUEST);
  }

  public get request(): AmqBusServerRequest {
    return this._request;
  }
  public get response(): AmqBusServerResponse {
    return this._response;
  }

  async onReceiverMessage(receiverContext: any) {
    const { _request, _response } = this;
    const message: Message = receiverContext.message;

    _request.consume(message);
    await _response.produce(_request.incomingMessage);
  }

  // async onReceiverError(receiver: any) {
  //   const err = receiver.error ?? new Error(`Receiver unknown error`);
  //   this.errorHandler(err);
  // }
}
