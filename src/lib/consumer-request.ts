import { BindingScope, Setter, inject, injectable } from "@loopback/core";
import { AmqBusBindings } from "../keys";
import { SharedBindings } from "../shared-keys";
import { AmqLogAdapter, Amqbus, XrequestId } from "./types";

@injectable({ scope: BindingScope.REQUEST })
export class ConsumerRequest implements Amqbus.Request {
  readonly name?: string;

  readonly inputQueue: string;

  public messageId: string;

  public correlationId?: string;

  public requestBody: string | null;

  // protected incomingMessage: Amqbus.IncomingMessage | undefined;

  constructor(
    @inject.setter(SharedBindings.X_REQUEST_ID)
    protected requestIdSetter: Setter<XrequestId>,
    @inject(AmqBusBindings.Consumer.OPTIONS)
    readonly options: Amqbus.ConsumeOptions,
    @inject(AmqBusBindings.LOG_ADAPTER, { optional: true })
    public loqAdapter?: AmqLogAdapter,
  ) {
    const { name, inputQueue } = options;
    this.name = name;
    this.inputQueue = inputQueue;
  }

  protected bindRequestId(requestId: XrequestId) {
    this.requestIdSetter(requestId);
  }

  public receive(incomingMessage: Amqbus.IncomingMessage) {
    const { data, messageId, correlationId } = incomingMessage;
    this.messageId = messageId;
    this.requestBody = data;
    this.correlationId = correlationId;

    this.bindRequestId(messageId);

    this.loqAdapter?.onConsumerRequest(this.options, incomingMessage);
  }
}
