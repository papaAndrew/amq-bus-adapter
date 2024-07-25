import { BindingScope, Provider, inject, injectable } from "@loopback/core";
import { ConnectionOptions } from "rhea";
import { AmqpConnector } from "../lib/amqp-connector";
import {
  AmqBusBindings,
  AmqBusLogAdapter,
  AmqBusOptions,
  AmqConnector,
  ErrorHandler,
  getConnectionDetails,
} from "./types";

const AMQP_PORT = 5672;

type ConnectionTransport = "tls" | "ssl";

@injectable({ scope: BindingScope.APPLICATION })
export class AmqConnectorProvider implements Provider<AmqConnector> {
  private amqpConnector: AmqpConnector;

  readonly config: ConnectionOptions;

  constructor(
    @inject(AmqBusBindings.CONFIG)
    options: AmqBusOptions,
    @inject(AmqBusBindings.FATAL_ERROR_HANDLER)
    errorHandler: ErrorHandler,
    @inject(AmqBusBindings.LOG_ADAPTER)
    logAdapter: AmqBusLogAdapter,
  ) {
    const {
      transport: givenTransport,
      port: givenPort,
      brokers,
      reconnectOptions,
      ...cfg
    } = options.connector;
    const port = Number(givenPort ?? AMQP_PORT);
    const transport = <ConnectionTransport>givenTransport;
    const connection_details =
      brokers && getConnectionDetails(brokers, { transport });

    const connectionOptions: ConnectionOptions = {
      ...cfg,
      port,
      transport,
      connection_details,
    };
    if (reconnectOptions) {
      switch (typeof reconnectOptions.reconnect) {
        case "boolean":
          connectionOptions.reconnect = Boolean(reconnectOptions.reconnect);
          break;
        case "number":
          connectionOptions.reconnect = Number(reconnectOptions.reconnect);
          break;
        case "string":
          if (
            reconnectOptions.reconnect === "false" ||
            reconnectOptions.reconnect === "true"
          ) {
            connectionOptions.reconnect = reconnectOptions.reconnect === "true";
          } else {
            connectionOptions.reconnect = Number(connectionOptions.reconnect);
          }
          break;
        default:
          break;
      }
      if (reconnectOptions.attemptLimit) {
        connectionOptions.reconnect_limit = Number(
          reconnectOptions.attemptLimit,
        );
      }
      if (reconnectOptions.minInterval) {
        connectionOptions.initial_reconnect_delay = Number(
          reconnectOptions.minInterval,
        );
      }
      if (reconnectOptions.maxInterval) {
        connectionOptions.max_reconnect_delay = Number(
          reconnectOptions.maxInterval,
        );
      }
    }
    this.amqpConnector = new AmqpConnector(connectionOptions);
    this.amqpConnector.setLogAdapter(logAdapter);
    this.amqpConnector.setErrorHandler(errorHandler);
  }

  async value(): Promise<AmqConnector> {
    await this.amqpConnector.connect();
    return this.amqpConnector;
  }
}
