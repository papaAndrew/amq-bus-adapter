import {
  BindingScope,
  CoreBindings,
  Provider,
  inject,
  injectable,
} from "@loopback/core";
import { AmqbLogAdapter, ApiLogAdapter } from "../lib/amqb-log-adapter";
import { AmqBusLogAdapter } from "./types";

export const MESSAGE_LOG_ADAPTER = `${CoreBindings.COMPONENTS}.ApiLogAdapterComponent.MessageLogAdapter`;

@injectable({ scope: BindingScope.TRANSIENT })
export class AmqBusLogAdapterProvider implements Provider<AmqBusLogAdapter> {
  private adapter: AmqBusLogAdapter;

  constructor(
    @inject(MESSAGE_LOG_ADAPTER, { optional: true })
    apiLogAdapter?: ApiLogAdapter,
  ) {
    this.adapter = new AmqbLogAdapter(apiLogAdapter);
  }

  value(): AmqBusLogAdapter {
    return this.adapter;
  }
}
