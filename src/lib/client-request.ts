import { Connection, Delivery, Message, ReceiverOptions, filter } from "rhea";
import {
  AmqBusClientRequest,
  AmqBusRouteOptions,
  AmqLogAdapter,
  AmqMessage,
  Amqbus,
} from "..";
import { createMessage, genUuid4, rheaToAmqMessage, waitFor } from "./tools";

/**
 * Timeout awaiting response
 */
const DEFAULT_TIMEOUT = 60000;
/**
 * Response polling interval
 */
const DEFAULT_INTERVAL = 1;

export class ClientRequest implements AmqBusClientRequest {
  messageId?: string;
  correlationId?: string;
  timeout: number = DEFAULT_TIMEOUT;

  private sentRequest: Amqbus.OutcomingMessage | undefined;

  constructor(
    protected connection: Connection,
    readonly route: AmqBusRouteOptions,
    private logAdapter?: AmqLogAdapter,
    defaultTimeout?: number,
  ) {
    this.timeout = defaultTimeout ?? DEFAULT_TIMEOUT;
  }

  protected getRequestQueue(): string {
    const { outputQueue } = this.route;
    if (outputQueue) {
      return outputQueue;
    }
    throw new Error(`Client request queue is ${outputQueue}`);
  }

  protected getResponseQueue(): string {
    const { inputQueue } = this.route;
    if (inputQueue) {
      return inputQueue;
    }
    throw new Error(`Client response queue is ${inputQueue}`);
  }

  protected genUuid(): string {
    return genUuid4();
  }

  async send(body: string): Promise<AmqMessage> {
    if (this.sentRequest) {
      throw new Error(`Request already sent`);
    }
    const { logAdapter, correlationId, timeout } = this;

    const queue: string = this.getRequestQueue();
    const sender = this.connection.open_sender(queue);

    const message: Message = createMessage(body)(correlationId);
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
    const stopWatch = waitFor(timeout, DEFAULT_INTERVAL, () => {
      return !!delivery;
    });

    return Promise.all([watchQue, stopWatch])
      .then(() => {
        if (delivery) {
          this.sentRequest = rheaToAmqMessage<Amqbus.OutcomingMessage>(message);
          logAdapter?.onClientRequest(this.sentRequest);
          return this.sentRequest;
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

  private async lookingFor(
    address: string,
    correlationId: string,
  ): Promise<Amqbus.OutcomingMessage> {
    const { logAdapter } = this;
    const rcvOpts: ReceiverOptions = {
      source: {
        address,
        filter: filter.selector(`JMSCorrelationID='${correlationId}'`),
      },
    };
    const receiver = this.connection.open_receiver(rcvOpts);

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
          logAdapter?.onClientResponse(result);
          return result as Amqbus.OutcomingMessage;
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
  async getResponse(timeout?: number): Promise<AmqMessage> {
    const { messageId } = this.sentRequest ?? {};
    if (messageId) {
      if (timeout) {
        this.timeout = timeout;
      }
      const queue = this.getResponseQueue();

      return this.lookingFor(queue, messageId);
    }

    throw new Error("Request is not defined");
  }
}
