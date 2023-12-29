import {
  BindingScope,
  Provider,
  ValueOrPromise,
  injectable,
} from "@loopback/core";
import { ResponseBuilder } from "../lib/types";

@injectable({ scope: BindingScope.APPLICATION })
export class ResponseBuilderProvider implements Provider<ResponseBuilder> {
  constructor() {} //

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
