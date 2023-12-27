import {
  Connection,
  ConnectionOptions,
  Container,
  Receiver,
  ReceiverOptions,
  Sender,
  SenderOptions,
  create_container,
} from "rhea";
import { AmqConnector } from "./types";

/**
 *
 */
export class AmqpConnector implements AmqConnector {
  private connection: Connection | undefined;

  private container: Container = create_container();

  constructor(readonly config: ConnectionOptions) {}

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

  public async connect() {
    if (this.isConnected()) {
      this.disconnect();
    }

    if (this.config) {
      return this.justConnect(this.config).catch((err) => {
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

  createSender(options: string | SenderOptions): Sender {
    const connection = this.getConnection();
    return connection.open_sender(options);
  }
  createReceiver(options: string | ReceiverOptions): Receiver {
    const connection = this.getConnection();
    return connection.open_receiver(options);
  }
}
