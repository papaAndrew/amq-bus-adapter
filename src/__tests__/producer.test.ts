import { ConnectionOptions } from "rhea";
import { genUuid4 } from "..";
import { AmqpConnector } from "../lib/amqp-connector";
import { Producer } from "../lib/producer";
import { OperationResult, OperationStatus, RouteOptions } from "../lib/types";

const ROUTE_CONSUMER: RouteOptions = {
  address: "TEST5.TEST.IN",
  replyTo: "TEST5.TEST.OUT",
};
const ROUTE_PRODUCER: RouteOptions = {
  address: "TEST5.TEST.OUT",
  replyTo: "TEST5.TEST.OUT",
  timeout: 1000,
};

const CONNECTION_OPTIONS: ConnectionOptions = {
  host: "esb-dev01-t",
  port: 5672,
  username: "amqp",
  password: "amqp",
};

describe("Producer", () => {
  let connector: AmqpConnector;
  // let consumer: Consumer;
  let producer: Producer;

  beforeAll(async () => {
    connector = new AmqpConnector(CONNECTION_OPTIONS);
    await connector.connect();
    // consumer = new Consumer(connector);
    producer = new Producer(connector);
    await producer.open(ROUTE_PRODUCER);
  });

  afterAll(async () => {
    await producer.close();
    connector.disconnect();
  });

  it("Producer request", async () => {
    const body = "Producer request";
    const ref = {
      status: OperationStatus.SUCCESS,
      address: ROUTE_PRODUCER.address,
      message: {
        data: body,
      },
    };

    const result = await producer.send({ body });

    expect(result).toMatchObject(ref);
  });

  it("Producer request then reply", async () => {
    const body = "Producer request then reply";
    const correlationId = genUuid4();
    const ref: OperationResult = {
      status: OperationStatus.SUCCESS,
      address: ROUTE_PRODUCER.address,
      message: {
        correlationId,
        data: body,
      },
    };

    const result = await producer
      .send({
        body,
        correlationId,
      })
      .then((request) => request.receiveReply(3000));

    expect(result).toMatchObject(ref);
  });

  it("Producer request reply", async () => {
    const body = "Producer then reply";
    const ref: OperationResult = {
      status: OperationStatus.SUCCESS,
      address: ROUTE_PRODUCER.address,
      message: {
        data: body,
      },
    };

    const result = await producer.requestReply(body, 3000);

    expect(result).toMatchObject(ref);
  });
});
