import { ConnectionOptions } from "rhea";
import {
  AmqBusComponent,
  AmqBusOptions,
  ConnectorOptions,
  RouteOptions,
} from "..";
import { AmqpConnector } from "../lib/amqp-connector";
import { Consumer } from "../lib/consumer";
import { Producer } from "../lib/producer";

const ROUTE_PRODUCER: RouteOptions = {
  address: "TEST7.PRODUCER.OUT",
  timeout: 1000,
};

const ROUTE_CONSUMER: RouteOptions = {
  address: "TEST7.CONSUMER.IN",
};

const ROUTE_BACKOUT: RouteOptions = {
  address: "TEST7.BACKOUT",
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

describe("AmqBusComponent", () => {
  let connector: AmqpConnector;
  let consumer: Consumer;
  let producer: Producer;
  let backout: Producer;
  let component: AmqBusComponent;

  beforeAll(async () => {
    connector = new AmqpConnector(CONNECTION_OPTIONS);
    await connector.connect();

    consumer = new Consumer(connector);
    await consumer.open(ROUTE_CONSUMER);

    producer = new Producer(connector);
    await producer.open(ROUTE_PRODUCER);

    backout = new Producer(connector);
    await backout.open(ROUTE_BACKOUT);

    component = new AmqBusComponent();
    await component.init(connector, consumer, producer, backout);
  });

  afterAll(async () => {
    await component.stop();
  });

  it("Members are on when comp started", () => {
    expect(connector.isConnected()).toBeTruthy();
    expect(consumer.isOpen()).toBeTruthy();
    expect(producer.isOpen()).toBeTruthy();
    expect(backout.isOpen()).toBeTruthy();
  });

  it("Members are off when comp stopped", async () => {
    await component.stop();

    expect(connector.isConnected()).toBeFalsy();
    expect(consumer.isOpen()).toBeFalsy();
    expect(producer.isOpen()).toBeFalsy();
    expect(backout.isOpen()).toBeFalsy();
  });
});
