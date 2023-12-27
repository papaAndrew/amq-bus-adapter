import {
  BindingScope,
  Provider,
  ValueOrPromise,
  inject,
  injectable,
} from "@loopback/core";
import { AmqBusBindings } from "../lib/keys";
import { AmqBusLogAdapter, ResponseBuilder } from "../lib/types";

@injectable({ scope: BindingScope.APPLICATION })
export class ResponseBuilderProvider implements Provider<ResponseBuilder> {
  constructor(
    @inject(AmqBusBindings.LOG_ADAPTER)
    private logAdapter: AmqBusLogAdapter,
  ) {} //

  private buildResponse(requestBody: string): ValueOrPromise<string | void> {
    // this.logAdapter.
    console.log("Message terminated", { requestBody });
  }

  value(): ResponseBuilder {
    return {
      buildResponse: this.buildResponse.bind(this),
    };
  }
}
