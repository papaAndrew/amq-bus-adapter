import { BindingScope, Provider, inject, injectable } from "@loopback/core";
import { AmqLogAdapter } from "../lib";
import { AmqBusLogAdapter, ApiLogAdapter } from "../lib/amq-bus-log-adapter";
import { SharedBindings } from "../shared-keys";

@injectable({
  scope: BindingScope.TRANSIENT,
})
export class AmqBusLogAdapterProvider implements Provider<AmqLogAdapter> {
  private adapter: AmqLogAdapter;

  constructor(
    @inject(SharedBindings.MESSAGE_LOG_ADAPTER, { optional: true })
    apiLogAdapter?: ApiLogAdapter,
  ) {
    this.adapter = new AmqBusLogAdapter(apiLogAdapter);
  }

  value(): AmqLogAdapter {
    return this.adapter;
  }
}
