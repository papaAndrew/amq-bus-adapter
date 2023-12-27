import { Receiver, ReceiverOptions, filter } from "rhea";
import { AmqBusServer, AmqConnector, ConsumerOptions } from "./types";

export class ConsumerServer implements AmqBusServer {
  private receiver?: Receiver;

  constructor(
    private connector: AmqConnector,
    private onMessage: (ctx: any) => void,
    private errorHandler: (err?: any) => void,
    private options: ConsumerOptions,
  ) {}

  createReceiver(topic: string): Receiver | undefined {
    let receiver: Receiver | undefined;
    const receiverOptions: ReceiverOptions = {
      source: {
        address: topic,
        filter: filter.selector(`JMSCorrelationID is null`),
      },
    };

    try {
      receiver = this.connector.createReceiver(receiverOptions);
    } catch (err) {
      this.errorHandler(err);
    }
    return receiver;
  }

  public start() {
    this.receiver = this.createReceiver(this.options.topic);

    if (this.receiver) {
      this.receiver.on("message", this.onMessage.bind(this));

      this.receiver.on("receiver_error", (receiver) => {
        const cause = receiver.error ?? `Receiver unknown error`;
        this.errorHandler(new Error(cause));
      });
    }
  }

  stop() {
    if (this.receiver) {
      this.receiver.close();
    }
  }
}
