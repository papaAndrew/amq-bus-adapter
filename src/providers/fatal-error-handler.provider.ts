import { BindingScope, Provider, inject, injectable } from "@loopback/core";
import { exit } from "process";
import { AmqBusBindings, AmqBusLogAdapter, ErrorHandler } from "./types";

@injectable({ scope: BindingScope.SINGLETON })
export class FatalErrorHandlerProvider implements Provider<ErrorHandler> {
  constructor(
    @inject(AmqBusBindings.LOG_ADAPTER)
    private logAdapter: AmqBusLogAdapter,
  ) {}

  private onError(err: any) {
    // console.log("fatal error", JSON.stringify(err));

    this.logAdapter.onError("Fatal Error Exception. Reboot...", err);

    exit(1);
  }

  value(): ErrorHandler {
    return (err: any) => {
      this.onError(err);
    };
  }
}
