import { injectable } from "@loopback/core";
import { Message } from "rhea";
import { rheaToAmqMessage } from "./tools";
import {
  AmqBusLogAdapter,
  AmqBusServerRequest,
  AmqMessage,
  ConsumeMsgResult,
  ConsumeMsgStatus,
} from "./types";

@injectable()
export class ServerRequest implements AmqBusServerRequest {
  private _incomingMessage: AmqMessage | undefined;

  constructor(
    private loqAdapter: AmqBusLogAdapter,
    readonly topic: string,
  ) {}

  public get incomingMessage(): AmqMessage {
    if (this._incomingMessage) {
      return this._incomingMessage;
    }
    throw new Error(`IncomingMessage is not defined`);
  }

  public consume(message: Message) {
    this._incomingMessage = rheaToAmqMessage(message);

    const consumeMsgResult: ConsumeMsgResult = {
      status: ConsumeMsgStatus.SUCCESS,
      address: this.topic,
      message: this.incomingMessage,
    };
    this.loqAdapter.onServerRequest(consumeMsgResult);
  }
}
