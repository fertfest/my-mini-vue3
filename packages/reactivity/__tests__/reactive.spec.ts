import { effect } from "../src/effect";
import { isProxy, isReactive, reactive } from "../src/reactive";

describe("reactive", () => {
  it("happy path", () => {
    const original = { foo: 1 };
    const observed = reactive(original);
    expect(observed).not.toBe(original);
    expect(observed.foo).toBe(1);
    expect(isReactive(observed)).toBe(true);
    expect(isReactive(original)).toBe(false);
    expect(isProxy(observed)).toBe(true);
    expect(isProxy(original)).toBe(false);
  });

  it("nested reactive", () => {
    const original = {
      nested: {
        foo: 1,
      },
      array: [{ bar: 2 }],
    };

    const observed = reactive(original);
    let v;
    effect(() => {
      v = observed;
    });

    observed.nested.foo++;
    expect(v.nested.foo).toBe(2);
  });

  test("nested isReactive", () => {
    const original = {
      nested: {
        foo: 1,
      },
      array: [{ bar: 2 }],
    };

    const observed = reactive(original);
    expect(isReactive(observed.nested)).toBe(true);
    expect(isReactive(observed.array)).toBe(true);
    expect(isReactive(observed.array[0])).toBe(true);
  });
});