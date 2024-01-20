import { createVNode } from "../vnode";

export function renderSlots(slots, name, prop) {
  const slot = slots[name];
  if (slot) {
    if (typeof slot === "function") {
      return createVNode("div", {}, slot(prop));
    }
  }
}
