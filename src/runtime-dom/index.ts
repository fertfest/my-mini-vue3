import { createRenderer } from "../runtime-core";
import { EMPTY_OBJECT } from "../shared";

function createElement(type) {
  return document.createElement(type);
}

function patchProp(el, key, prevProp, nextProp) {
  const isOn = /^on[A-Z]/.test(key);

  if (nextProp === undefined || nextProp === null) {
    (el as HTMLElement).removeAttribute(key);
  } else {
    if (isOn) {
      const event = key.slice(2).toLowerCase();

      (el as HTMLElement).addEventListener(event, nextProp);
    } else {
      el.setAttribute(key, nextProp);
    }
  }
}

function insert(el, container, anchor) {
  container.insertBefore(el, anchor);
}

function remove(childNode) {
  const parent = childNode.parentNode;
  if (parent) {
    parent.removeChild(childNode);
  }
}

function setElementText(text, container) {
  (container as Element).textContent = text;
}

const renderer = createRenderer({
  createElement,
  patchProp,
  insert,
  remove,
  setElementText,
});

export function createApp(rootComponent) {
  return renderer.createApp(rootComponent);
}

export * from "../runtime-core";
