import { Connection, Delivery, Message, ReceiverOptions, filter } from "rhea";
import { AmqConnector } from "./amq-connector";
import { genUuid4, rheaToAmqMessage, waitFor } from "./tools";
import {
  AmqBusProducer,
  AmqBusRouteOptions,
  AmqLogAdapter,
  AmqMessage,
  Amqbus,
} from "./types";

/**
 *
 */
const DEFAULT_TIMEOUT = 60000;
/**
 *
 */
const DEFAULT_INTERVAL = 2000;

export class ProducerClient implements AmqBusProducer {
  private timeout: number = DEFAULT_TIMEOUT;

  constructor(
    protected connector: AmqConnector,
    readonly options: AmqBusRouteOptions,
    private logAdapter?: AmqLogAdapter,
  ) {
    this.timeout = options.timeout ?? DEFAULT_TIMEOUT;
  }

  protected getConnection(): Connection {
    const { connection } = this.connector;
    if (connection) {
      return connection;
    }
    throw new Error(`Connection ${typeof connection}`);
  }
  protected getOutgoingQueue(): string {
    const { outputQueue } = this.options;
    if (outputQueue) {
      return outputQueue;
    }
    throw new Error(`Outgoing queue is ${outputQueue}`);
  }

  protected genUuid(): string {
    return genUuid4();
  }

  /**
   *
   * @param requestBody
   * @param correlationId
   * @returns
   */
  async notify(
    requestBody: string,
    correlationId?: string,
  ): Promise<Amqbus.OutcomingMessage> {
    const { logAdapter, options } = this;
    const queue: string = this.getOutgoingQueue();

    const message: Message = {
      message_id: this.genUuid(),
      correlation_id: correlationId,
      body: requestBody,
    };

    const sender = this.getConnection().open_sender(queue);
    let delivery: Delivery | undefined;

    const watchQue = new Promise<void>((resolve, reject) => {
      sender.on("sendable", () => {
        delivery = sender.send(message);
        resolve();
      });
      sender.on("sender_error", (context) => {
        const error =
          context.error ?? new Error(`Sender 'sender_error' event occured`);
        reject(error);
      });
    });
    const stopWatch = waitFor(this.timeout, DEFAULT_INTERVAL, () => {
      return !!delivery;
    });

    return Promise.all([watchQue, stopWatch])
      .then(() => {
        if (delivery) {
          const result = rheaToAmqMessage<Amqbus.OutcomingMessage>(message);
          logAdapter?.onProducerRequest(options, result);
          return result;
        }
        throw new Error(`Delivery state is ${typeof delivery}`);
      })
      .catch((err) => {
        logAdapter?.onError("Amq.producer.sender ERROR", err);
        throw err;
      })
      .finally(() => {
        sender.close();
      });
  }

  async replyTo(address: string, correlationId: string): Promise<AmqMessage> {
    const { logAdapter, options } = this;
    const rcvOpts: ReceiverOptions = {
      source: {
        address,
        filter: filter.selector(`JMSCorrelationID='${correlationId}'`),
      },
    };
    const receiver = this.getConnection().open_receiver(rcvOpts);

    let result: AmqMessage | undefined;

    const watchQue = new Promise<void>((resolve, reject) => {
      receiver.on("message", (context) => {
        const message = context.message as Message;
        result = rheaToAmqMessage<AmqMessage>(message);
        resolve();
      });
      receiver.on("receiver_error", ({ receiver }) => {
        const error =
          receiver.error ??
          new Error(`Receiver 'receiver_error' event occured`);
        reject(error);
      });
    });

    const stopWatch = waitFor(this.timeout, DEFAULT_INTERVAL, () => !!result);

    return Promise.all([watchQue, stopWatch])
      .then(() => {
        if (result) {
          logAdapter?.onProducerResponse(options, result);
          return result;
        }
        throw new Error(`Unknown message received '${result}'`);
      })
      .catch((err) => {
        logAdapter?.onError("Amq.producer.sender ERROR", err);
        throw err;
      })
      .finally(() => {
        receiver.close();
      });
  }
  /**
   *
   * @param requestBody
   */
  async requestReply(requestBody: string): Promise<AmqMessage> {
    const { inputQueue } = this.options;
    if (inputQueue) {
      return this.notify(requestBody).then((amqMessage) =>
        this.replyTo(
          inputQueue,
          (<Amqbus.IncomingMessage>amqMessage).messageId,
        ),
      );
    }
    throw new Error(`Input queue is undefined for requestReply`);
  }
}
