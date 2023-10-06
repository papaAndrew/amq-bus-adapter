import { BindingScope, Provider, inject, injectable } from "@loopback/core";
import { Request, RestBindings } from "@loopback/rest";
import { AmqBusBindings } from "../keys";
import { AmqBusOptions, AmqBusRouteOptions } from "../lib";

@injectable({
  scope: BindingScope.REQUEST,
})
export class RouteConfigProvider implements Provider<AmqBusRouteOptions> {
  private path: string;

  private routes: AmqBusRouteOptions | AmqBusRouteOptions[] | undefined;

  constructor(
    @inject(RestBindings.Http.REQUEST)
    httpRequest: Request,
    @inject(AmqBusBindings.CONFIG)
    options: AmqBusOptions,
  ) {
    this.path = httpRequest.path;
    this.routes = options.producer;
  }

  value(): AmqBusRouteOptions {
    const { path, routes } = this;
    let result: AmqBusRouteOptions | undefined;

    if (Array.isArray(routes)) {
      result = routes.find((route) => route.name === path);
    } else {
      result = routes;
    }
    if (result) {
      return result;
    }
    throw new Error(`Route config not found for path '${path}'`);
  }
}
