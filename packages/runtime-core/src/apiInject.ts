import { getCurrentInstance } from "./component";

export function inject(key: string, defaultValue: any) {
  const currentInstance = getCurrentInstance();
  if (currentInstance) {
    const parentProvides = currentInstance.parent.provides;
    if (key in parentProvides) {
      return parentProvides[key];
    } else if (defaultValue) {
      if (typeof defaultValue === "function") {
        return defaultValue();
      }
      return defaultValue;
    }
  }
  // const currentInstance = getCurrentInstance();
  // let instancePointer = currentInstance;
  // let parentProvides = instancePointer.parent.provides;
  // if (currentInstance) {
  //   while (parentProvides && parentProvides[key] === undefined) {
  //     instancePointer = instancePointer.parent;
  //     parentProvides = instancePointer.parent?.provides;
  //   }
  // }
  // if (parentProvides && parentProvides[key]) {
  //   return parentProvides[key];
  // }
  // if (defaultValue === undefined) {
  //   return undefined;
  // }
  // if (typeof defaultValue === "function") {
  //   return defaultValue();
  // }
  // return defaultValue;
}

export function provide(key: string, value: any) {
  const currentInstance = getCurrentInstance();
  if (currentInstance) {
    let { provides } = currentInstance;
    // const parentProvides = currentInstance.parent.provides;

    // if (provides === parentProvides) {
    //   provides = currentInstance.provides = Object.create(parentProvides);
    // }
    provides[key] = value;
  }
}
