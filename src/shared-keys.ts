import {BindingKey, CoreBindings} from "@loopback/core";

export namespace SharedBindings {
  /**
   *
   */
  export const X_REQUEST_ID = BindingKey.create("X-Request-Id");
  /**
   *
   */
  export const MESSAGE_LOG_ADAPTER = `${CoreBindings.COMPONENTS}.ApiLogAdapterComponent.MessageLogAdapter`;
}
