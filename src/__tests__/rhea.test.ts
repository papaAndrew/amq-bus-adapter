import {
  Connection,
  ConnectionOptions,
  Container,
  Delivery,
  Message,
  create_container,
} from "rhea";
import { waitFor } from "..";
import { RouteOptions } from "../lib/types";

const ROUTE_CONSUMER: RouteOptions = {
  address: "TEST6.TEST.IN",
  replyTo: "TEST6.TEST.OUT",
};
const ROUTE_PRODUCER: RouteOptions = {
  address: "TEST6.TEST.OUT",
  replyTo: "TEST6.TEST.IN",
  timeout: 1000,
};

const CONNECTION_OPTIONS: ConnectionOptions = {
  host: "esb-dev01-t",
  port: 5672,
  username: "amqp",
  password: "amqp",
  reconnect: true,
  initial_reconnect_delay: 500,
  max_reconnect_delay: 1000,
  reconnect_limit: 2,
};

describe("Container", () => {
  let container: Container;
  let connection: Connection;

  let containerErrors: Record<string, any>[];

  beforeAll(() => {
    container = create_container();
    container.on("error", (err) => {
      containerErrors.push({ ["container.error"]: err });
    });
    container.on("connection_error", (err) => {
      containerErrors.push({ ["container.connection_error"]: err });
    });
  });

  beforeEach(() => {
    containerErrors = [];
    connection = container.connect(CONNECTION_OPTIONS);
    connection.on("error", (err) => {
      containerErrors.push({ ["connection.error"]: err });
    });
    connection.on("connection_error", (err) => {
      containerErrors.push({ ["connection.connection_error"]: err });
    });
  });

  afterEach(() => {
    connection?.close();
  });

  it("Connection", async () => {
    const isOpen = await waitFor(3000, 3, () => connection.is_open()).catch(
      () => false,
    );
    expect(isOpen).toBeTruthy();
  });

  it("Sender may sendable", async () => {
    let isSendable = false;
    const sender = connection
      .open_sender(ROUTE_PRODUCER.address)
      .on("sendable", () => {
        isSendable = true;
        sender.close();
      });

    await waitFor(3000, 3, () => isSendable).catch(() => false);

    expect(isSendable).toBeTruthy();
  });

  it("Sender enqueues message", async () => {
    const body = "Sender enqueues message";
    const message: Message = {
      body,
    };
    let delivery: Delivery;

    const sender = connection
      .open_sender(ROUTE_PRODUCER.address)
      .on("sendable", () => {
        delivery = sender.send(message);
        sender.close();
      });

    const isSendable = await waitFor(
      3000,
      3,
      sender.sendable.bind(sender),
    ).catch(() => false);

    expect(isSendable).toBeTruthy();
    expect(delivery.link).toMatchObject(sender);
  });

  /**ё
   * Этот кейс не стабилен, иногда он самопроизвольно ломается.
   * Предположительно, по причине досрочной вычитке буферов.
   * Это часто проявляется, если попытаться получить (залогировать) промежуточные результаты
   */
  // it.skip("Sender reconnect", async () => {

  //   connection.close();
  //   const isClosed = await waitFor(3000, 3, connection.is_closed.bind(connection))
  //     .catch(() => false);

  //   const sender = connection.open_sender(ROUTE_PRODUCER.address);
  //   const isSendable = await waitFor(10000, 3, () => sender.sendable()).catch(() => false);

  //   expect(isClosed).toBeTruthy();
  //   expect(isSendable).toBeTruthy();
  //   expect(containerErrors.length).toBe(0);
  // });

  /**
   * Этот кейс не стабилен, иногда он самопроизвольно ломается.
   * Предположительно, по причине подкапотных попыток реконнекта.
   * К тому же, он выдает ложный результат, если утверждает чот отправка прошла успешно,
   * на самом деле сообщение здесь никогда не отправляется.
   */
  // it.skip("Sender enqueues message after disconnect", async () => {
  //   const body = "Sender cannot enqueue message";

  //   const sender = connection.open_sender(ROUTE_PRODUCER.address);
  //   await waitFor(3000, 3, sender.sendable.bind(sender))
  //     .catch(() => false);

  //   sender.on('sender_error', (err) => containerErrors.push({['sender_error']: err}))
  //   sender.on('rejected', (err) => containerErrors.push({['rejected']: err}))

  //   connection.close();
  //   const isClosed = await waitFor(5000, 3, connection.is_closed.bind(connection))
  //     .catch(() => false);

  //   const delivery = sender.send({body});
  //   // console.log("delivery", delivery);

  //   await waitFor(10000, 3, () => (containerErrors.length > 0))
  //     .catch(() => false);

  //   console.log("containerErrors", containerErrors);

  //   // expect(sender.sendable()).toBeTruthy();
  //   expect(isClosed).toBeTruthy();
  //   expect(containerErrors.length).toBe(0);
  //   // expect("connection_error" in containerErrors[0]).toBeTruthy();
  // });
});
