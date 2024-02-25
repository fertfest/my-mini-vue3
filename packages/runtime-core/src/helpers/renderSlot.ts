import { Fragment } from "../vnode";
import { createVNode } from "../vnode";

export function renderSlot(slots, name, prop) {
  const slot = slots[name];
  if (slot) {
    if (typeof slot === "function") {
      return createVNode(Fragment, {}, slot(prop));
    }
  }
}
