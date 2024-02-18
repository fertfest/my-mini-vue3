import { shallowReadonly } from "../reactivity/reactive";
import { initProps } from "./componentProps";
import { publicInstanceProxyHandlers } from "./componentPublicInstanceHandlers";
import { emit } from "./componentEmit";
import { initSlots } from "./componentSlots";
import { proxyRefs } from "..";

export function createComponentInstance(vnode, parent) {
  const instance = {
    vnode,
    type: vnode.type,
    setupState: {},
    props: {},
    emit: (str: any) => {},
    parent,
    next: null,
    update: null,
    // provides: parent ? parent.provides : {},
    provides: parent ? Object.create(parent.provides) : {},
    slots: {},
    isInitializing: true,
    subTree: null,
  };

  vnode.component = instance;
  instance.emit = emit.bind(null, instance);

  return instance;
}

export function setupComponent(instance) {
  initProps(instance, instance.vnode.props);

  initSlots(instance, instance.vnode.children);

  setupStatefulComponent(instance);
}

function setupStatefulComponent(instance: any) {
  const Component = instance.type;

  instance.proxy = new Proxy({ _: instance }, publicInstanceProxyHandlers);

  const { setup } = Component;
  if (setup) {
    setCurrentInstance(instance);
    const setupResult = setup(shallowReadonly(instance.props), {
      emit: instance.emit,
    });
    setCurrentInstance(null);
    handleSetupResult(instance, setupResult);
  }
}

function handleSetupResult(instance, setupResult: any) {
  // function Object
  // TODO: function
  if (typeof setupResult === "object") {
    instance.setupState = proxyRefs(setupResult);
  }

  finishComponentSetup(instance);
}

function finishComponentSetup(instance: any) {
  const Component = instance.type;

  if (Component.render) {
    instance.render = Component.render;
  }
}

let currentInstance: any = null;
export function getCurrentInstance() {
  return currentInstance;
}

export function setCurrentInstance(instance) {
  currentInstance = instance;
}
