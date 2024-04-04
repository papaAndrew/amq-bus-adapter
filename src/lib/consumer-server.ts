import {Receiver, ReceiverOptions} from "rhea";
import {
  AmqBusServer,
  AmqConnector,
  ConsumerOptions,
  ErrorHandler,
  ReceiverMessageFunction
} from "./types";

export class ConsumerServer implements AmqBusServer {
  receiver?: Receiver;

  constructor(
    private connector: AmqConnector,
    private options: ConsumerOptions,
    private receiverMessageFunction: ReceiverMessageFunction,
    private errorHandler: ErrorHandler,
  ) { }

  createReceiver(topic: string, timeout?: number): Receiver | undefined {
    let receiver: Receiver | undefined;
    const receiverOptions: ReceiverOptions = {
      source: {
        address: topic,
        timeout,
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
    const {timeout, topic} = this.options;
    this.receiver = this.createReceiver(topic, timeout && Number(timeout));

    if (this.receiver) {
      this.receiver.on("message", this.receiverMessageFunction.bind(this));

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
