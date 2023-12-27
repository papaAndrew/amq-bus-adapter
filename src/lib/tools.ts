import { Message } from "rhea";
import { v4 as uuid4 } from "uuid";
import { AmqBusRequestConfig, AmqMessage } from "./types";

export function rheaToAmqMessage<T = AmqMessage>(message: Message): T {
  const { body, correlation_id, message_id, creation_time } =
    message as Message;
  const amqMessage: AmqMessage = {
    created: creation_time?.toISOString(),
    data: String(body),
    correlationId: correlation_id?.toString(),
    messageId: message_id?.toString(),
  };
  return amqMessage as T;
}

export function waitFor<T = boolean>(
  timeout: number,
  interval: number,
  haveResult: (timer: number) => T | undefined,
): Promise<T> {
  const timeStart = new Date().getTime();
  const timeStop = timeStart + timeout;

  return new Promise((resolve, reject) => {
    const task = () => {
      const now = new Date().getTime();
      if (now > timeStop) {
        const err = new Error(`Timeout elapsed (${timeout} ms)`);
        reject(err);
        return;
      }
      const result = haveResult(now - timeStart);
      if (result) {
        resolve(result);
        return;
      }
      // timer = timer -= interval;
      setTimeout(task, interval);
    };
    task();
  });
}

export function genUuid4() {
  return uuid4();
}

export function createMessage(requestConfig: AmqBusRequestConfig) {
  const { body, messageId, correlationId } = requestConfig;
  const message: Message = {
    body,
    message_id: messageId ?? genUuid4(),
    correlation_id: correlationId,
    creation_time: new Date(),
  };
  return message;
}

export function nowLocaleTime(): string {
  const localTime = new Date().toISOString();
  return localTime;
}
