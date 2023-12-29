import {
  BindingScope,
  Context,
  Getter,
  Provider,
  inject,
  injectable,
} from "@loopback/core";
import { AmqBusBindings } from "../lib/keys";
import { ServerContext } from "../lib/server-context";
import { ServerRequest } from "../lib/server-request";
import { ServerResponse } from "../lib/server-response";
import {
  AmqBusLogAdapter,
  AmqConnector,
  BuildResponseFunction,
  ConsumerOptions,
  ResponseBuilder,
  ServerContextFactory,
} from "../lib/types";

@injectable({ scope: BindingScope.SINGLETON })
export class ServerContextFactoryProvider
  implements Provider<ServerContextFactory>
{
  constructor(
    @inject(AmqBusBindings.CONNECTOR)
    private connector: AmqConnector,
    @inject.context()
    private parentContext: Context,
    @inject(AmqBusBindings.LOG_ADAPTER)
    private logAdapter: AmqBusLogAdapter,
    @inject.getter(AmqBusBindings.RESPONSE_BUILDER, { optional: true })
    private responseBuilderGetter?: Getter<ResponseBuilder>,
  ) {}

  private createRequest(options: ConsumerOptions): ServerRequest {
    const request = new ServerRequest(this.logAdapter, options.topic);
    return request;
  }

  private async getBuildResponseFunc(): Promise<
    BuildResponseFunction | undefined
  > {
    return this.responseBuilderGetter().then((buider) => buider.buildResponse);
  }

  private async createResponse(
    options: ConsumerOptions,
  ): Promise<ServerResponse> {
    const buildResponse = await this.getBuildResponseFunc();

    const request = new ServerResponse(
      this.logAdapter,
      this.connector,
      options,
      buildResponse,
    );
    return request;
  }

  private async createContext(
    options: ConsumerOptions,
  ): Promise<ServerContext> {
    const request = this.createRequest(options);
    const response = await this.createResponse(options);

    const context = new ServerContext(request, response, this.parentContext);
    return context;
  }

  value(): ServerContextFactory {
    return {
      createContext: this.createContext.bind(this),
    };
  }
}
