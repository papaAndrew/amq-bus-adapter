import { describe } from "@jest/globals";
import { AmqBusBindings } from "../lib/keys";
import { waitFor } from "../lib/tools";

const TIMEOUT = 3000;
const INTERVAL = 1;

describe.skip("Tools", () => {
  it("Binding module", async () => {
    expect(AmqBusBindings.COMPONENT).toMatchObject({
      key: "components.AmqBusComponent",
      propertyPath: undefined,
    });
  });

  it("WaitFor resolved for specified condition with 5% divergence", async () => {
    const CONDITION = 1000;
    const diver = CONDITION * 0.05;

    const result = await waitFor<number>(TIMEOUT, INTERVAL, (timer) => {
      if (timer >= CONDITION) {
        return timer;
      }
    });

    const delta = result - CONDITION;
    expect(delta).not.toBeLessThan(0);
    expect(delta).toBeLessThan(diver);
  });

  it("WaitFor rejects timed out with 5% divergence", async () => {
    const diver = TIMEOUT * 0.05;

    const timeBefore = new Date().getTime();
    let timeAfter = timeBefore;

    await waitFor<boolean>(TIMEOUT, INTERVAL, (timer) => {
      return false;
    }).catch(() => {
      timeAfter = new Date().getTime();
    });

    const delta = timeAfter - timeBefore - TIMEOUT;

    expect(delta).toBeGreaterThan(0);
    expect(delta).toBeLessThan(diver);
  });
});
