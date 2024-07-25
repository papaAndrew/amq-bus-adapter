import { ConnectionOptions } from "rhea";
import { Consumer } from "../lib/consumer";
import { Producer } from "../lib/producer";
import { genUuid4, waitFor } from "../lib/tools";
import {
  AmqBusOptions,
  AmqConnector,
  ConnectorOptions,
  ConsumerResult,
  OperationStatus,
  ProducerRequest,
  RequestConfig,
  RouteOptions,
} from "../lib/types";
import { AmqConnectorProvider } from "../providers/amq-connector.provider";
import { BackoutProducerProvider } from "../providers/backout-producer.provider";
import { BackoutRequestProvider } from "../providers/backout-request.provider";
import { ConsumerProvider } from "../providers/consumer.provider";
import { ProducerRequestProvider } from "../providers/producer-request.provider";
import { ProducerProvider } from "../providers/producer.provider";
import { MockConsumerRequest } from "./helpers/mock-consumer-request";
import { MockLogAdapter } from "./helpers/mock-log-adapter";

const ROUTE_PRODUCER: RouteOptions = {
  address: "TEST1.CONSUMER.IN",
  replyTo: "TEST1.BACKOUT",
  timeout: 1000,
};

const ROUTE_CONSUMER: RouteOptions = {
  address: "TEST1.CONSUMER.IN",
};

const ROUTE_BACKOUT: RouteOptions = {
  address: "TEST1.BACKOUT",
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
  producer: ROUTE_PRODUCER,
  consumer: ROUTE_CONSUMER,
  backout: ROUTE_BACKOUT,
};

const FATAL_ERROR_HANDLER = () => {};
/**
 *
 */
describe("Backout Producer Provider", () => {
  let connector: AmqConnector;
  let mockLogAdapter: MockLogAdapter;
  let producer: Producer;
  let producerRequest: ProducerRequest;
  let backoutProducer: Producer;
  let backoutProducerRequest: ProducerRequest;
  let consumer: Consumer;
  let mockConsumerRequest: MockConsumerRequest;

  beforeAll(async () => {
    connector = await new AmqConnectorProvider(
      OPTIONS,
      FATAL_ERROR_HANDLER,
      mockLogAdapter,
    ).value();
    await connector.connect();
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

    producerRequest = new ProducerRequestProvider(producer).value();

    backoutProducer = await new BackoutProducerProvider(
      connector,
      OPTIONS,
      FATAL_ERROR_HANDLER,
      mockLogAdapter,
    ).value();

    backoutProducerRequest = new BackoutRequestProvider(producer).value();

    consumer = await new ConsumerProvider(
      connector,
      OPTIONS,
      FATAL_ERROR_HANDLER,
      new MockLogAdapter(),
      mockConsumerRequest.onConsumerRequest.bind(mockConsumerRequest),
    ).value();
  });

  afterAll(async () => {
    await producer.close();
    await backoutProducer.close();
    await consumer.close();
    connector.disconnect();
  });

  it("Backout Producer provided", async () => {
    expect(mockLogAdapter._producerOpen).toMatchObject(ROUTE_BACKOUT);

    expect(backoutProducer.isOpen()).toBeTruthy();
  });

  /**
   * 1. Продусер-1 отправляет запрос в очередь AMQADAPTER.CONSUMER.IN
   * 2. Продусер-1 ожидает ответ в очереди BACKOUT
   * 3. Консумер вычитывает сообщение из очереди AMQADAPTER.CONSUMER.IN и передает Продусеру-2 (BackoutProducer)
   * 4. Продусер-2 отправляет сообщение в очередь BACKOUT
   * 5. Продусер-1 вычитывает сообщение из очереди BACKOUT (aka reply)
   */
  it("Backout Producer send to DLQ", async () => {
    const body = "Backout Producer send to DLQ";
    const correlationId = genUuid4();

    const request1 = await producerRequest.send({
      body,
      correlationId,
    });
    const response1 = request1.receiveReply(3000);

    await waitFor(3000, 3, () => !!mockConsumerRequest._consumerResult).catch(
      () => {
        mockConsumerRequest._consumerResult = {
          status: OperationStatus.TIMED_OUT,
        } as ConsumerResult;
      },
    );

    const received = mockConsumerRequest._consumerResult.message;
    if (received) {
      const resend: RequestConfig = {
        ...received,
        body: received.data,
      };
      await backoutProducer.send(resend);
    }

    const result = await response1;

    // console.log("result", result);
    expect(result.message?.data).toBe(body);
    expect(mockLogAdapter._producerRequest).toMatchObject(result);
    expect(received.data).toBe(body);
  });
});
