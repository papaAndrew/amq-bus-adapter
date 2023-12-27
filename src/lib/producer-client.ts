import { ClientRequest } from "./client-request";
import {
  AmqBusClient,
  AmqBusClientRequest,
  AmqBusLogAdapter,
  AmqBusRequestConfig,
  AmqConnector,
  ConsumeMsgResult,
  ProduceMsgResult,
  ProducerOptions,
} from "./types";

export class ProducerClient implements AmqBusClient {
  constructor(
    private logAdapter: AmqBusLogAdapter,
    protected connector: AmqConnector,
    readonly options?: ProducerOptions,
  ) {}

  buildConfig(options?: ProducerOptions): AmqBusRequestConfig {
    return {
      ...this.options,
      ...options,
    };
  }

  createRequest(options?: ProducerOptions): AmqBusClientRequest {
    const { connector, logAdapter } = this;
    const config = this.buildConfig(options);

    const request = new ClientRequest(logAdapter, connector, config);
    return request;
  }

  /**
   *
   * @param requestBody
   * @param correlationId
   * @returns
   */
  async notify(
    requestBody: string,
    correlationId?: string,
  ): Promise<ProduceMsgResult> {
    const request = this.createRequest({
      body: requestBody,
      correlationId,
    });
    return request.send();
  }

  /**
   *
   * @param requestBody
   */
  async requestReply(requestBody: string): Promise<ConsumeMsgResult> {
    return this.createRequest(this.options)
      .send({ body: requestBody })
      .then((producerResult) => producerResult.receiveResponse());
  }
}
