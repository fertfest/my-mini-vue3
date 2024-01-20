import { ShapeFlags } from "../shared/ShapeFlags";
import { isObject } from "../shared/index";
import { createComponentInstance, setupComponent } from "./component";

export function render(vnode, container) {
  // patch
  patch(vnode, container);
}

function patch(vnode, container) {
  // 判断是不是 element
  if (vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
    // 处理组件
    processComponent(vnode, container);
  } else if (vnode.shapeFlag & ShapeFlags.ELEMENT /* 例如 'div'*/) {
    processElement(vnode, container);
  }
}

function processElement(vnode: any, container: any) {
  mountElement(vnode, container);
}

function mountElement(vnode, container) {
  const el = (vnode.el = document.createElement(vnode.type));

  // props
  for (const key in vnode.props) {
    const val = vnode.props[key];

    const isOn = /^on[A-Z]/.test(key);

    if (isOn) {
      const event = key.slice(2).toLowerCase();

      (el as HTMLElement).addEventListener(event, val);
    } else {
      el.setAttribute(key, val);
    }
  }

  // children
  if (vnode.shapeFlag & ShapeFlags.TEXT_CHILDREN) {
    el.textContent = vnode.children;
  } else if (vnode.shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
    mountChildren(vnode, el);
  }
  container.append(el);
}

function mountChildren(vnode, container) {
  vnode.children.forEach((child) => {
    patch(child, container);
  });
}

function processComponent(vnode: any, container) {
  mountComponent(vnode, container);
}

function mountComponent(initialVNode: any, container) {
  const instance = createComponentInstance(initialVNode);

  setupComponent(instance);
  setupRenderEffect(instance, container);
}

function setupRenderEffect(instance: any, container) {
  const subTree = instance.render.call(instance.proxy);
  // vnode -> patch
  // vnode -> element -> mountElement
  console.log(subTree);

  patch(subTree, container);

  instance.vnode.el = subTree.el;
}
