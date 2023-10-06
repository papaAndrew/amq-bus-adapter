import { Message } from "rhea";
import { v4 as uuid4 } from "uuid";
import { AmqMessage } from "./amq-connector";

export function rheaToAmqMessage<T = AmqMessage>(message: Message): T {
  const { body, correlation_id, message_id } = message as Message;
  const amqMessage: AmqMessage = {
    messageId: message_id ? String(message_id) : undefined,
    correlationId: correlation_id ? String(correlation_id) : undefined,
    data: body,
  };
  return amqMessage as T;
}

export function waitFor(
  timeout: number,
  interval: number,
  canResolve: (timer: number) => boolean,
): Promise<void> {
  return new Promise((resolve, reject) => {
    let timer = timeout;
    const task = function () {
      if (timer < 0) {
        const err = new Error(`Timeout elapsed`);
        reject(err);
        return;
      }
      if (canResolve(timer)) {
        resolve();
        return;
      }
      timer = timer -= interval;
      setTimeout(task, interval);
    };
    task();
  });
}

export function genUuid4() {
  return uuid4();
}
