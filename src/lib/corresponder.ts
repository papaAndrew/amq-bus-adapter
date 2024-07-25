import { Receiver, ReceiverOptions, Sender, SenderOptions } from "rhea";
import { waitFor } from "./tools";
import { AmqConnector, Pluggable, RouteOptions } from "./types";

const OPEN_TIMEOUT = 30000;

const OPEN_CHECK_INTERVAL = 3;

export abstract class Corresponder implements Pluggable {
  protected _receiver?: Receiver;

  protected _sender?: Sender;

  protected address?: string;

  protected replyTo?: string;

  protected timeout: number = OPEN_TIMEOUT;

  constructor(protected connector: AmqConnector) {}

  public abstract isOpen(): boolean;

  public abstract connectionError(ctx: any): void;

  public abstract receiverError(ctx: any): void;

  public abstract senderError(ctx: any): void;

  public abstract receiverMessage(ctx: any): void;

  // public abstract senderMessage(ctx: any): void;

  public abstract getReceiverAddress(): string;

  public abstract getSenderAddress(): string;

  protected getReceiverOptions(): ReceiverOptions {
    const address = this.getReceiverAddress();
    if (address) {
      const receiverOptions: ReceiverOptions = {
        source: {
          address,
          timeout: this.timeout,
        },
      };
      return receiverOptions;
    }
  }

  protected getSenderOptions(): SenderOptions {
    const address = this.getSenderAddress();

    if (address) {
      const senderOptions: SenderOptions = {
        target: {
          address,
          timeout: this.timeout,
        },
      };
      return senderOptions;
    }
  }

  protected async setupReciever(): Promise<void> {
    const receiverOptions = this.getReceiverOptions();
    if (receiverOptions) {
      const receiver = this.connector
        .createReceiver(receiverOptions)
        .on("message", this.receiverMessage.bind(this))
        .on("receiver_error", this.receiverError.bind(this))
        .on("receiver_open", () => {
          this._receiver = receiver;
        });

      await waitFor<Receiver>(
        OPEN_TIMEOUT,
        OPEN_CHECK_INTERVAL,
        () => this._receiver,
      );
      return;
    }

    this._receiver
      ?.on("receiver_close", () => {
        this._receiver = undefined;
      })
      .close();
    await waitFor(OPEN_TIMEOUT, OPEN_CHECK_INTERVAL, () => !this._receiver);
  }

  protected async setupSender(): Promise<void> {
    const senderOptions = this.getSenderOptions();
    if (senderOptions) {
      const sender = this.connector
        .createSender(senderOptions)
        .on("rejected", this.senderError.bind(this))
        .on("sender_error", this.senderError.bind(this))
        .on("sendable", () => {
          this._sender = sender;
        });

      await waitFor<Sender>(
        OPEN_TIMEOUT,
        OPEN_CHECK_INTERVAL,
        () => this._sender,
      );
      return;
    }

    this._sender
      ?.on("sender_close", () => {
        this._sender = undefined;
      })
      .close();
    await waitFor(OPEN_TIMEOUT, OPEN_CHECK_INTERVAL, () => !this._sender);
  }

  async open(opions: RouteOptions): Promise<void> {
    const { address, replyTo, timeout } = opions;
    this.address = address;
    this.replyTo = replyTo;
    this.timeout = timeout ? Number(timeout) : OPEN_TIMEOUT;

    await Promise.all([this.setupReciever(), this.setupSender()]).catch(
      (err) => {
        this.connectionError(err);
      },
    );
  }

  async close() {
    this.timeout = OPEN_TIMEOUT;
    this.address = undefined;
    this.replyTo = undefined;

    await Promise.all([this.setupReciever(), this.setupSender()]).catch(
      (err) => {
        this.connectionError(err);
      },
    );
  }
}
