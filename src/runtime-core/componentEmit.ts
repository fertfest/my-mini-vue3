import { capitalizeFirst, hasOwn } from "../shared/index";

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

  console.log(eventName);

  if (hasOwn(instance.props, eventName)) {
    instance.props[eventName](...rest);
  }
};
