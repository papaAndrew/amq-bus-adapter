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
import { AmqBusLogAdapter, AmqConnector, ErrorHandler } from "./types";

/**
 *
 */
export class AmqpConnector implements AmqConnector {
  private connection: Connection | undefined;

  private container: Container = create_container();

  private _errorHandler?: ErrorHandler;

  public setErrorHandler(errorHandler: ErrorHandler) {
    this._errorHandler = errorHandler;
  }

  private logAdapter?: AmqBusLogAdapter;

  public setLogAdapter(logAdapter: AmqBusLogAdapter) {
    this.logAdapter = logAdapter;
  }

  constructor(readonly config: ConnectionOptions) {
    this.container
      .on("error", this.onConnectionError.bind(this))
      .on("connection_error", this.onConnectionError.bind(this));
  }

  private onConnectionError(err: any) {
    this.logAdapter?.onConnectionError(err);
    this._errorHandler?.(err);
  }

  private onDisconnected(ctx: any) {
    if (ctx.reconnecting) {
      return;
    }
    if (ctx.error) {
      // this.onConnectionClose(ctx.error);
      this.onConnectionError(ctx.error);
    }
  }

  private onConnectionOpen() {
    // this.connection
    //   .on('disconnected', this.onDisconnected.bind(this))
    this.logAdapter?.onConnect({ config: this.config });
  }

  private onConnectionClose(ctx?: any) {
    this.connection = undefined;
    this.logAdapter?.onDisconnect(ctx);
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
        .on("error", reject)
        .on("disconnected", this.onDisconnected.bind(this));
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
      return;
    }

    if (this.config) {
      return this.justConnect(this.config)
        .then(this.onConnectionOpen.bind(this))
        .catch(this.onConnectionError.bind(this));
    }

    this.onConnectionError(new Error(`Connection options undefined`));
  }

  public async disconnect() {
    return new Promise<void>((resolve) => {
      if (this.isConnected()) {
        this.connection
          .on("connection_close", () => {
            this.onConnectionClose(true);
            resolve();
          })
          .close();
      } else {
        this.onConnectionClose(false);
        resolve();
      }
    });
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
