import { Provider, inject, injectable } from "@loopback/core";
import { Request, RestBindings, RestRouter } from "@loopback/rest";
import { AmqBusBindings } from "../lib/keys";
import { AmqBusOptions, AmqBusRouteOptions } from "../lib/types";

// export type RouteConfigFactory = (alias: string) => AmqBusRouteOptions | undefined;
// export type RouteConfigMap = Record<string, AmqBusRouteOptions>;
export type RouteConfig = AmqBusRouteOptions;

@injectable()
export class RouteConfigProvider implements Provider<RouteConfig> {
  constructor(
    @inject(AmqBusBindings.CONFIG)
    private options: AmqBusOptions,
    @inject(RestBindings.Http.REQUEST, { optional: true })
    private httpRequest?: Request,
    @inject(RestBindings.ROUTER, { optional: true })
    private router?: RestRouter,
  ) {}

  private isRouteProducer(route: AmqBusRouteOptions) {
    const { router, httpRequest } = this;
    const { path } = route;
    if (path && httpRequest) {
      const resolvedRoute = router.find(httpRequest);
      return resolvedRoute.path === path;
    }
  }

  value(): AmqBusRouteOptions {
    const { producer: routes } = this.options;
    let result: AmqBusRouteOptions;

    if (Array.isArray(routes)) {
      result =
        routes.find((route) => this.isRouteProducer(route)) ??
        routes.find((route) => !route.path);
    } else {
      result = routes;
    }
    if (result) {
      return result;
    }
    throw new Error(`Route config not found`);
  }
}
