import { ConnectionOptions } from "rhea";
import {
  AmqBusOptions,
  AmqConnector,
  ConnectorOptions,
  ProducerRequest,
  RouteOptions,
  waitFor,
} from "..";
import { Producer } from "../lib/producer";
import { AmqConnectorProvider } from "../providers/amq-connector.provider";
import { ProducerRequestProvider } from "../providers/producer-request.provider";
import { ProducerProvider } from "../providers/producer.provider";
import { MockLogAdapter } from "./helpers/mock-log-adapter";

const ROUTE_CONSUMER: RouteOptions = {
  address: "TEST4.CONSUMER.IN",
  replyTo: "TEST4.CONSUMER.OUT",
};
const ROUTE_PRODUCER: RouteOptions = {
  address: "TEST4.PRODUCER.OUT",
  replyTo: "TEST4.PRODUCER.OUT",
  timeout: 1000,
};

const CONNECTION_OPTIONS: ConnectionOptions = {
  host: "esb-dev01-t",
  port: 5672,
  username: "amqp",
  password: "amqp",
};

const OPTIONS: AmqBusOptions = {
  connector: CONNECTION_OPTIONS as ConnectorOptions,
  consumer: ROUTE_CONSUMER,
  producer: ROUTE_PRODUCER,
};

const FATAL_ERROR_HANDLER = () => {};

/**
 *
 */
describe("Producer Provider", () => {
  let connector: AmqConnector;
  let mockLogAdapter: MockLogAdapter;
  let producer: Producer;
  let producerRequest: ProducerRequest;

  beforeAll(async () => {
    connector = await new AmqConnectorProvider(
      OPTIONS,
      FATAL_ERROR_HANDLER,
      mockLogAdapter,
    ).value();

    await connector.connect();

    mockLogAdapter = new MockLogAdapter();

    producer = await new ProducerProvider(
      connector,
      OPTIONS,
      FATAL_ERROR_HANDLER,
      mockLogAdapter,
    ).value();

    producerRequest = new ProducerRequestProvider(producer).value();
  });

  afterAll(async () => {
    connector.disconnect();
  });

  it("Opened Producer provided", async () => {
    expect(mockLogAdapter._producerOpen).toMatchObject(ROUTE_PRODUCER);

    expect(producer.isOpen()).toBeTruthy();
  });

  it("Producer send request", async () => {
    const body = "Producer send request";

    const result = await producerRequest.send(body);

    await result.receiveReply(3000);

    await waitFor(3000, 3, () => !!mockLogAdapter._receiverMessage);

    expect(producerRequest.address).toEqual(ROUTE_PRODUCER.address);
    expect(producerRequest.replyTo).toEqual(ROUTE_PRODUCER.replyTo);
    expect(result.message?.data).toEqual(body);
    expect(mockLogAdapter._producerRequest).toMatchObject(result);
    expect(mockLogAdapter._receiverMessage).toBeDefined();
  });
});
