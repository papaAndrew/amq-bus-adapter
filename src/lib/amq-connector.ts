import {
  Connection,
  ConnectionOptions,
  Container,
  Message,
  ReceiverOptions,
  create_container,
} from "rhea";

export { ConnectionError, ConnectionOptions, Message } from "rhea";

export interface AmqMessage {
  messageId?: string;
  correlationId?: string;
  data: string | null;
}

export class AmqConnector {
  public options: ConnectionOptions | undefined;

  public connection: Connection | undefined;

  readonly container: Container = create_container();

  getOptions() {
    return this.options;
  }

  public isConnected(): boolean {
    return !!this.connection && this.connection.is_open();
  }

  protected async justConnect(options: ConnectionOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      this.connection = this.container
        .connect(<ConnectionOptions>options)
        .on("connection_open", resolve)
        .on("connection_error", reject)
        .on("error", reject);
    });
  }
  protected getConnection(): Connection {
    if (this.connection) {
      return this.connection;
    }
    throw new Error(`Connection not defined`);
  }

  public async connect(options: ConnectionOptions) {
    if (this.isConnected()) {
      this.disconnect();
    }
    this.options = options;

    if (this.options) {
      return this.justConnect(this.options).catch((err) => {
        throw err.error;
      });
    }

    throw new Error(`Connection options undefined`);
  }

  public disconnect() {
    if (this.isConnected()) {
      this.connection?.close();
    }
  }

  public async quePut(
    topic: string,
    xmlMessage: string,
    correlationId?: string,
  ): Promise<AmqMessage> {
    const message: Message = {
      application_properties: {
        messageId: "1234567890",
        correlationId,
      },
      body: xmlMessage,
    };
    const sender = this.getConnection().open_sender(topic);

    return new Promise((resolve, reject) => {
      sender.on("sendable", () => {
        sender.send(message);

        resolve({
          messageId: message.application_properties?.messageId ?? "",
          data: message.body,
        });
        sender.close();
      });

      sender.on("sender_error", (err) => {
        console.log("sender_error", err);
        reject(err.error);
      });
    });
  }

  public async queOnce(
    topic: string,
    correlationId?: string,
  ): Promise<AmqMessage> {
    const opts: ReceiverOptions = {
      credit_window: 1,
      source: {
        address: topic,
        filter: correlationId
          ? this.container.filter.selector(`correlationId = '${correlationId}'`)
          : undefined,
      },
    };
    const receiver = this.getConnection().open_receiver(opts);

    return new Promise((resolve, reject) => {
      receiver.on("message", (context) => {
        const { message } = context;
        resolve({
          messageId: message.application_properties?.messageId ?? "",
          correlationId: message.application_properties?.correlationId,
          data: message.body,
        });
        receiver.close();
      });

      receiver.on("receiver_error", () => {
        //console.log("receiver_error", receiver);

        const error = receiver.error ?? new Error(`Receiver unknown  error`);
        reject(error);
      });
    });
  }
}
