import { ConnectionOptions } from "rhea";
import { waitFor } from "..";
import { Consumer } from "../lib/consumer";
import { Producer } from "../lib/producer";
import {
  AmqBusOptions,
  AmqConnector,
  ConnectorOptions,
  OperationResult,
  OperationStatus,
  RouteOptions,
} from "../lib/types";
import { AmqConnectorProvider } from "../providers/amq-connector.provider";
import { ConsumerProvider } from "../providers/consumer.provider";
import { ProducerProvider } from "../providers/producer.provider";
import { MockConsumerRequest } from "./helpers/mock-consumer-request";
import { MockLogAdapter } from "./helpers/mock-log-adapter";

const ROUTE_CONSUMER: RouteOptions = {
  address: "TEST2.CONSUMER.IN",
  timeout: 3000,
};
const ROUTE_PRODUCER: RouteOptions = {
  address: "TEST2.CONSUMER.IN",
  timeout: 3000,
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

describe("Consumer Provider", () => {
  let producer: Producer;
  let connector: AmqConnector;
  let consumer: Consumer;
  let mockLogAdapter: MockLogAdapter;
  let mockConsumerRequest: MockConsumerRequest;

  beforeAll(async () => {
    connector = await new AmqConnectorProvider(
      OPTIONS,
      FATAL_ERROR_HANDLER,
      mockLogAdapter,
    ).value();
    await connector.connect();

    // mockError = new MockErrorHandler();
    mockLogAdapter = new MockLogAdapter();
    mockConsumerRequest = new MockConsumerRequest();

    producer = await new ProducerProvider(
      connector,
      OPTIONS,
      FATAL_ERROR_HANDLER,
      new MockLogAdapter(),
    ).value();

    consumer = await new ConsumerProvider(
      connector,
      OPTIONS,
      FATAL_ERROR_HANDLER,
      mockLogAdapter,
      mockConsumerRequest.onConsumerRequest.bind(mockConsumerRequest),
    ).value();
  });

  afterAll(async () => {
    await consumer.close();
    await producer.close();
    connector.disconnect();
  });

  it("Opened Consumer provided", async () => {
    expect(mockLogAdapter._consumerOpen).toMatchObject(ROUTE_CONSUMER);

    expect(consumer.isOpen()).toBeTruthy();
  });

  it("Consumer consumes", async () => {
    const body = "Consumer consumes";
    const ref: OperationResult = {
      status: OperationStatus.SUCCESS,
      message: {
        data: body,
      },
    };

    await producer.send(body);

    const recieved = await waitFor<OperationResult>(
      3000,
      3,
      () => mockConsumerRequest._consumerResult,
    ).catch(() => {
      return { status: OperationStatus.TIMED_OUT } as OperationResult;
    });

    expect(recieved).toMatchObject(ref);
  });
});
