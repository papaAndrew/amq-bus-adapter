import { Context, inject, injectable } from "@loopback/core";
import { exit } from "process";
import {
  Connection,
  Delivery,
  Message,
  Receiver,
  ReceiverOptions,
  filter,
} from "rhea";
import { AmqConnector, AmqMessage } from "./amq-connector";
import { AmqBusBindings } from "./keys";
import { createMessage, rheaToAmqMessage, waitFor } from "./tools";
import { Amqbus } from "./types";

/**
 *
 */
const DEFAULT_TIMEOUT = 60000;
/**
 *
 */
const DEFAULT_INTERVAL = 1;

@injectable()
export class AmqBusConsumer implements Amqbus.Consumer {
  private receiver?: Receiver;

  private outputQueue?: string;

  private timeout: number = DEFAULT_TIMEOUT;

  constructor(
    @inject.context()
    protected parentContext: Context,
    @inject(AmqBusBindings.CONNECTOR)
    protected connector: AmqConnector,
    @inject(AmqBusBindings.FATAL_ERROR_HANDLER)
    protected errorHandler: (err?: any) => void,
  ) {}

  private getConnection(): Connection {
    const { connection } = this.connector;
    if (connection) {
      return connection;
    }
    throw new Error(`Connection ${typeof connection}`);
  }

  private createContext(): Amqbus.ConsumerContext {
    const context = this.parentContext.getSync(AmqBusBindings.Consumer.CONTEXT);
    return context as Amqbus.ConsumerContext;
  }

  private received(options: Amqbus.ConsumeOptions, message: Message) {
    const amqMessage = rheaToAmqMessage<Amqbus.IncomingMessage>(message);
    const context = this.createContext();
    const onResponse = this.send.bind(this);
    context.consume(options, amqMessage, onResponse);
  }

  public open(options: Amqbus.ConsumeOptions) {
    if (options.timeout) {
      this.timeout = options.timeout;
    }
    this.outputQueue = options.outputQueue;

    const rcvOpts: ReceiverOptions = {
      source: {
        address: options.inputQueue,
        filter: filter.selector(`JMSCorrelationID is null`),
      },
    };

    this.receiver = this.getConnection().open_receiver(rcvOpts);

    this.receiver.on("message", (context) => {
      this.received(options, context.message);
    });

    this.receiver.on("receiver_error", (receiver) => {
      if (this.errorHandler) {
        const error = receiver.error ?? new Error(`Receiver unknown error`);
        this.errorHandler(error);
      } else {
        console.log("errorHandler not found, exit 1");
        exit(1);
      }
    });
  }

  close() {
    if (this.receiver) {
      this.receiver.close();
    }
  }

  async send(amqMessage: AmqMessage) {
    if (this.outputQueue) {
      if (amqMessage.data) {
        return this.sendMessage(
          this.outputQueue,
          amqMessage as Amqbus.OutcomingMessage,
        );
      }
      throw new Error(`Empty data`);
    }
    throw new Error(`Outgoing queue is undefined`);
  }

  protected async sendMessage(
    queue: string,
    outcomingMessage: Amqbus.OutcomingMessage,
  ) {
    const { correlationId, data, messageId } = outcomingMessage;
    const message = createMessage(data, messageId)(correlationId);

    const connection = this.getConnection();
    const sender = connection.open_sender(queue);
    let delivery: Delivery | undefined;

    const watchQue = new Promise((resolve, reject) => {
      sender.on("sendable", () => {
        delivery = sender.send(message);
        resolve(delivery);
      });
      sender.on("sender_error", (context) => {
        reject(context.error);
      });
    });
    const stopWatch = waitFor(this.timeout, DEFAULT_INTERVAL, () => !!delivery);

    await Promise.all([watchQue, stopWatch]).finally(() => {
      sender.close();
    });
  }
}
