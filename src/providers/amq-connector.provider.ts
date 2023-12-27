import { BindingScope, Provider, inject, injectable } from "@loopback/core";
import { ConnectionOptions } from "rhea";
import { AmqpConnector } from "../lib/amqp-connector";
import { AmqBusBindings } from "../lib/keys";
import { AmqBusOptions, AmqConnector } from "../lib/types";

type ConnectionTransport = "tls" | "ssl";

@injectable({ scope: BindingScope.REQUEST })
export class AmqConnectorProvider implements Provider<AmqConnector> {
  private amqpConnector: AmqpConnector;

  readonly config: ConnectionOptions;

  constructor(
    @inject(AmqBusBindings.CONFIG)
    options: AmqBusOptions,
    // @inject(AmqBusBindings.LOG_ADAPTER)
    // logAdapter: AmqBusLogAdapter,
  ) {
    const { transport, port, ...cfg } = options.connector;
    const connectionOptions: ConnectionOptions = transport
      ? {
          ...cfg,
          port: Number(port),
          transport: <ConnectionTransport>transport,
        }
      : {
          ...cfg,
          port: Number(port),
        };

    this.amqpConnector = new AmqpConnector(connectionOptions);
  }

  value(): AmqConnector {
    return this.amqpConnector;
  }
}
