import { isProxy, isReactive, isReadonly, readonly } from "../reactive";

describe("readonly", () => {
  it("happy path", () => {
    // not set
    const original = { foo: 1, bar: { baz: 2 } };
    const wrapped = readonly(original);
    expect(wrapped).not.toBe(original);
    expect(isReadonly(wrapped)).toBe(true);
    expect(isReadonly(original)).toBe(false);
    expect(isProxy(wrapped)).toBe(true);
    expect(isProxy(original)).toBe(false);
    expect(wrapped.foo).toBe(1);

    // original.foo++;
    // expect(wrapped.foo).toBe(2);

    // original.bar.baz++;
    // expect(wrapped.bar.baz).toBe(3);

    // wrapped.bar.baz = 10;
    // expect(wrapped.bar.baz).toBe(3);
  });

  it("warn when call set", () => {
    console.warn = jest.fn();

    const user = readonly({
      age: 10,
    });

    user.age = 11;
    expect(console.warn).toHaveBeenCalled();
  });

  it("should make nested values readonly", () => {
    const original = { foo: 1, bar: { baz: 2 } };
    const wrapped = readonly(original);
    expect(isReadonly(wrapped)).toBe(true);
    expect(isReadonly(wrapped.bar)).toBe(true);
    expect(isReadonly(original)).toBe(false);
    expect(isReadonly(original.bar)).toBe(false);
    expect(isProxy(wrapped)).toBe(true);
    expect(isProxy(wrapped.bar)).toBe(true);
  });
});
