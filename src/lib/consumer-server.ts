import { Receiver, ReceiverOptions, filter } from "rhea";
import {
  AmqBusServer,
  AmqConnector,
  ConsumerOptions,
  ErrorHandler,
} from "./types";

export class ConsumerServer implements AmqBusServer {
  private receiver?: Receiver;

  constructor(
    private connector: AmqConnector,
    private options: ConsumerOptions,
    private onMessage: (ctx: any) => void,
    private errorHandler: ErrorHandler,
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
      this.errorHandler({
        sender: ConsumerServer.name,
        targret: "AmqConnector",
        event: "createReceiver",
        cause: JSON.stringify(err),
      });
    }
    return receiver;
  }

  public start() {
    this.receiver = this.createReceiver(this.options.topic);

    if (this.receiver) {
      this.receiver.on("message", this.onMessage.bind(this));

      this.receiver.on("receiver_error", (receiver) => {
        const cause = receiver
          ? JSON.stringify(receiver)
          : `Receiver unknown error`;
        this.errorHandler({
          sender: ConsumerServer.name,
          targret: "Receiver",
          event: "receiver_error",
          cause,
        });
      });
    }
  }

  stop() {
    if (this.receiver) {
      this.receiver.close();
    }
  }
}
