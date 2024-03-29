import { capitalizeFirst, hasOwn } from "@my-mini-vue3/shared";

export const emit = (instance, event: string, ...rest) => {
  let eventName = "on";
  let dashIndex = event.indexOf("-");

  while (dashIndex !== -1) {
    const firstWord = event.slice(0, dashIndex);
    event = event.slice(dashIndex + 1);
    eventName += capitalizeFirst(firstWord);
    dashIndex = event.indexOf("-");
  }

  eventName += capitalizeFirst(event);

  if (hasOwn(instance.props, eventName)) {
    instance.props[eventName](...rest);
  }
};
