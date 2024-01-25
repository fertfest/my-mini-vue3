import { createRenderer } from "../runtime-core";

function createElement(type) {
  return document.createElement(type);
}

function patchProp(el, key, val) {
  const isOn = /^on[A-Z]/.test(key);

  if (isOn) {
    const event = key.slice(2).toLowerCase();

    (el as HTMLElement).addEventListener(event, val);
  } else {
    el.setAttribute(key, val);
  }
}

function insert(el, container) {
  container.append(el);
}

const renderer = createRenderer({
  createElement,
  patchProp,
  insert,
});

export function createApp(rootComponent) {
  return renderer.createApp(rootComponent);
}

export * from "../runtime-core";
