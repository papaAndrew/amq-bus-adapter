import { BindingScope, inject, injectable } from "@loopback/core";
import { AmqBusBindings } from "../keys";
import { AmqBusRequest, AmqLogAdapter, AmqMessage, Amqbus } from "./types";

@injectable({ scope: BindingScope.REQUEST })
export class ConsumerResponse implements Amqbus.Response {
  outcomingMessage: AmqMessage;

  private cbSend: Amqbus.SendResponseFunction;

  constructor(
    @inject(AmqBusBindings.Consumer.OPTIONS)
    readonly options: Amqbus.ProduceOptions,
    @inject(AmqBusBindings.Consumer.REQUEST)
    protected request: AmqBusRequest,
    @inject(AmqBusBindings.LOG_ADAPTER, { optional: true })
    readonly loqAdapter?: AmqLogAdapter,
  ) {}

  init(onResponse: Amqbus.SendResponseFunction): void {
    this.cbSend = onResponse;
  }

  protected buildOutcomingMessage(data: string) {
    const result: Amqbus.OutcomingMessage = {
      correlationId: this.request.messageId,
      data,
    };
    return result;
  }
  /**
   *
   * @param responseBody
   * @returns Message was sent
   */
  async send(responseBody: string): Promise<AmqMessage> {
    // #TODO ?
    if (this.outcomingMessage) {
      return this.outcomingMessage;
    }

    this.outcomingMessage = this.buildOutcomingMessage(responseBody);
    await this.cbSend(this.outcomingMessage);

    this.loqAdapter?.onConsumerResponse(this.options, this.outcomingMessage);
    return this.outcomingMessage;
  }
}
