export * from "./toDisplayString";
export const extend = Object.assign;

export const EMPTY_OBJECT = {};

export function isObject(val) {
  return typeof val === "object" && val !== null;
}

export function isString(val) {
  return typeof val === "string";
}

export function hasChanged(val, newVal) {
  return !Object.is(newVal, val);
}

export function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

export function capitalizeFirst(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
