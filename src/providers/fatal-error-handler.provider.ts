import { Provider, ValueOrPromise, injectable } from "@loopback/core";
import { exit } from "process";
import { ErrorHandler } from "../lib/types";

@injectable()
export class FatalErrorHandlerProvider implements Provider<ErrorHandler> {
  constructor() {} // @inject() logAdapter: AmqBusLogAdapter
  private onError(err: any) {
    // TODO log err
    console.log("fatal error", JSON.stringify(err));

    exit(1);
  }

  value(): ValueOrPromise<ErrorHandler> {
    return (err: any) => {
      this.onError(err);
    };
  }
}
