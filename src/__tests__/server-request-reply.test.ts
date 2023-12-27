import { describe } from "@jest/globals";
import { AmqbLogAdapter } from "../lib/amqb-log-adapter";
import { AmqpConnector } from "../lib/amqp-connector";
import { ConsumerServerFactory } from "../lib/consumer-server-factory";
import { ProducerClient } from "../lib/producer-client";
import { genUuid4, waitFor } from "../lib/tools";
import { AmqConnector } from "../lib/types";
import { CONNECION_OPTIONS } from "./helpers";

const TOPIC = "AMQADAPTER.TEST.OUT";
const TIMEOUT = 2000;

describe("Server request-reply pattern", () => {
  let connector: AmqConnector;
  let client: ProducerClient;
  let factory: ConsumerServerFactory;

  beforeAll(async () => {
    const errorHandler = () => {};
    const logAdapter = new AmqbLogAdapter();
    connector = new AmqpConnector(CONNECION_OPTIONS);
    await connector.connect();

    client = new ProducerClient(logAdapter, connector);
    factory = new ConsumerServerFactory(logAdapter, connector, errorHandler);
  });

  afterAll(() => {
    connector.disconnect();
  });

  it("receive server request", async () => {
    const body = "receive server request";
    const ref = body;

    let result: string | undefined;
    let errorMessage: string | undefined;

    const server = factory.createServer(
      { topic: TOPIC },
      (requestBody: string) => {
        if (requestBody === body) {
          result = ref;
        }
      },
    );
    server.start();

    /** client sends request */
    await client.createRequest({ topic: TOPIC }).send(body);
    /** eof request */

    await waitFor(TIMEOUT, 1, () => !!result)
      .catch((err) => {
        errorMessage = err.message;
      })
      .finally(() => server.stop());

    expect(result).toEqual(ref);
    expect(errorMessage).toBeUndefined();
  });

  it("server does not receive a message contained assigned correlationId", async () => {
    const body =
      "server does not receive a message contained assigned correlationId";
    const ref = `Timeout elapsed (${TIMEOUT} ms)`;

    let result: string | undefined;
    let errorMessage: string | undefined;

    const server = factory.createServer(
      { topic: TOPIC },
      (requestBody: string) => {
        if (requestBody === body) {
          result = ref;
        }
      },
    );
    server.start();

    /** client sends request */
    await client
      .createRequest({
        topic: TOPIC,
        correlationId: genUuid4(),
      })
      .send(body);
    /** eof request */

    await waitFor(TIMEOUT, 1, () => !!result)
      .catch((err) => {
        errorMessage = err.message;
      })
      .finally(() => server.stop());

    expect(errorMessage).toEqual(ref);
    expect(result).toBeUndefined();
  });
});
