import { ValueOrPromise } from "@loopback/core";
import { ConnectionOptions } from "rhea";
import { genUuid4, waitFor } from "..";
import { AmqpConnector } from "../lib/amqp-connector";
import { Consumer } from "../lib/consumer";
import { Producer } from "../lib/producer";
import {
  ConsumerResult,
  OperationResult,
  OperationStatus,
  RouteOptions,
} from "../lib/types";

const ROUTE_CONSUMER: RouteOptions = {
  address: "TEST3.CONSUMER.IN",
  replyTo: "TEST3.CONSUMER.OUT",
};
const ROUTE_PRODUCER: RouteOptions = {
  address: "TEST3.CONSUMER.IN",
  replyTo: "TEST3.CONSUMER.OUT",
  timeout: 1000,
};

const CONNECTION_OPTIONS: ConnectionOptions = {
  host: "esb-dev01-t",
  port: 5672,
  username: "amqp",
  password: "amqp",
};

describe("Consumer", () => {
  let connector: AmqpConnector;
  let consumer: Consumer;
  let producer: Producer;

  beforeAll(async () => {
    connector = new AmqpConnector(CONNECTION_OPTIONS);
    await connector.connect();
    consumer = new Consumer(connector);
    await consumer.open(ROUTE_CONSUMER);
    producer = new Producer(connector);
    await producer.open(ROUTE_PRODUCER);
  });

  afterAll(async () => {
    await consumer.close();
    await producer.close();
    await connector.disconnect();
  });

  it("Consumer request", async () => {
    const body = "Consumer request";
    const ref = {
      status: OperationStatus.SUCCESS,
      address: ROUTE_CONSUMER.address,
      message: {
        data: body,
      },
    };

    let consumedRequest: Partial<ConsumerResult>;
    consumer.setConsumerResultHandler((consumerResult: ConsumerResult) => {
      if (consumerResult.message.data === body) {
        consumedRequest = consumerResult;
      }
    });

    // enqueue the request consumer must consume
    await producer.send(body);

    await waitFor(3000, 1, () => !!consumedRequest).catch(() => {
      consumedRequest = {
        status: OperationStatus.TIMED_OUT,
      };
    });
    expect(consumedRequest).toMatchObject(ref);
  });

  /**
   *
   */
  it("Consumer request reply", async () => {
    const bodyRq = "Consumer request";
    const bodyRs = "Consumer response";
    const correlationId = genUuid4();
    const ref = {
      status: OperationStatus.SUCCESS,
      address: ROUTE_CONSUMER.replyTo,
      message: {
        correlationId,
        data: bodyRs,
      },
    };

    // консумер ответит нам в очередь ROUTE_CONSUMER.replyTo
    let replySent: ValueOrPromise<OperationResult>;
    consumer.setConsumerResultHandler((consumerResult: ConsumerResult) => {
      console.log("consumerResult", consumerResult);
      if (consumerResult.message.correlationId === correlationId) {
        replySent = consumerResult.sendReply({
          correlationId,
          body: bodyRs,
        });
        console.log("replySent", replySent);
      }
    });

    // продусер будет ждать ответ в очереди ROUTE_CONSUMER.replyTo
    const result = await producer
      .send({
        correlationId,
        body: bodyRq,
      })
      .then(async (request) => {
        await replySent;
        return request.receiveReply(3000);
      });

    expect(result).toMatchObject(ref);
  });

  it("Producer reply timed out", async () => {
    const bodyRq = "Consumer request";
    const bodyRs = "Consumer response";
    const correlationId = genUuid4();
    const ref: OperationResult = {
      status: OperationStatus.TIMED_OUT,
      statusText: `Timeout elapsed (3000 ms)`,
    };

    // консумер отвечает неправильным correlationId
    let replySent: ValueOrPromise<OperationResult>;
    consumer.setConsumerResultHandler((consumeResult: ConsumerResult) => {
      if (consumeResult.message.correlationId === correlationId) {
        replySent = consumeResult.sendReply({
          correlationId: genUuid4(),
          body: bodyRs,
        });
      }
    });

    // продусер будет НАПРАСНО ждать коррелятор в очереди ROUTE_CONSUMER.replyTo
    // но любое сообщение съест
    const result = await producer
      .send({
        correlationId,
        body: bodyRq,
      })
      .then(async (request) => {
        await replySent;
        return request.receiveReply(3000);
      });

    expect(result).toMatchObject(ref);
  });

  it("Consumer close", async () => {
    await consumer.close();

    expect(consumer.isOpen()).toBeFalsy();
  });
});
