import {
  mutableHandlers,
  readonlyHandlers,
  shallowReadonlyHandlers,
} from "./baseHandlers";

export const enum ReactiveFlags {
  IS_REACTIVE = "__v_isReactive",
  IS_READONLY = "__v_isReadonly",
}

export function reactive(target) {
  return createActiveObject(target, mutableHandlers);
}

export function readonly(target) {
  return createActiveObject(target, readonlyHandlers);
}

export function shallowReadonly(target) {
  return createActiveObject(target, shallowReadonlyHandlers);
}

export function isReactive(value) {
  return !!value[ReactiveFlags.IS_REACTIVE];
}

export function isReadonly(value) {
  return !!value[ReactiveFlags.IS_READONLY];
}

export function isProxy(value) {
  return isReactive(value) || isReadonly(value);
}

function createActiveObject(target: any, baseHandlers) {
  return new Proxy(target, baseHandlers);
}
