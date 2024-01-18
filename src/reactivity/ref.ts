import { hasChanged, isObject } from "../shared";
import { trackActiveEffect, triggerEffects } from "./effect";
import { reactive } from "./reactive";

const isRefSymbol = Symbol();

class RefImpl {
  private _value: any;
  public _rawValue: any;
  public dep;
  constructor(value) {
    this._value = isObject(value) ? reactive(value) : value;
    this._rawValue = value;
    this.dep = new Set();
  }

  get value() {
    trackActiveEffect(this.dep);
    return this._value;
  }

  get [isRefSymbol]() {
    return true;
  }

  set value(newValue) {
    if (!hasChanged(newValue, this._rawValue)) return;

    this._value = isObject(newValue) ? reactive(newValue) : newValue;
    this._rawValue = newValue;
    triggerEffects(this.dep);
  }
}

export function ref(target) {
  return new RefImpl(target);
}

export function isRef(mayBeRef) {
  return !!mayBeRef[isRefSymbol];
}

export function unRef(mayBeRef) {
  return isRef(mayBeRef) ? mayBeRef.value : mayBeRef;
}

export function proxyRefs(original) {
  return new Proxy(original, {
    get(target, key) {
      // const mayBeRefRes = Reflect.get(target, key);
      // if (isRef(mayBeRefRes)) {
      //   return mayBeRefRes.value;
      // }
      // return mayBeRefRes;

      return unRef(Reflect.get(target, key));
    },
    set(target, key, newValue) {
      const mayBeRef = target[key];

      if (isRef(mayBeRef) && !isRef(newValue)) {
        mayBeRef.value = newValue;
      } else {
        target[key] = newValue;
      }

      return true;
    },
  });
}
