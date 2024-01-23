import { ShapeFlags } from "../shared/ShapeFlags";
import { createComponentInstance, setupComponent } from "./component";
import { Fragment, Text } from "./vnode";

export function render(vnode, container) {
  // patch
  patch(vnode, container, null);
}

function patch(vnode, container, parentComponent) {
  const { type } = vnode;

  switch (type) {
    case Fragment:
      processFragment(vnode, container, parentComponent);
      break;

    case Text:
      processText(vnode, container);
      break;

    default:
      // 判断是不是 element
      if (vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
        // 处理组件
        processComponent(vnode, container, parentComponent);
      } else if (vnode.shapeFlag & ShapeFlags.ELEMENT /* 例如 'div'*/) {
        processElement(vnode, container, parentComponent);
      }
  }
}

function processText(vnode: any, container: any) {
  const el = (vnode.el = document.createTextNode(vnode.children));
  container.append(el);
}

function processFragment(vnode: any, container: any, parentComponent) {
  mountChildren(vnode, container, parentComponent);
}

function processElement(vnode: any, container: any, parentComponent) {
  mountElement(vnode, container, parentComponent);
}

function mountElement(vnode, container, parentComponent) {
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
    mountChildren(vnode, el, parentComponent);
  }
  container.append(el);
}

function mountChildren(vnode, container, parentComponent) {
  vnode.children.forEach((child) => {
    patch(child, container, parentComponent);
  });
}

function processComponent(vnode: any, container, parentComponent) {
  mountComponent(vnode, container, parentComponent);
}

function mountComponent(initialVNode: any, container, parentComponent) {
  const instance = createComponentInstance(initialVNode, parentComponent);

  setupComponent(instance);
  setupRenderEffect(instance, container);
}

function setupRenderEffect(instance: any, container) {
  const subTree = instance.render.call(instance.proxy);
  // vnode -> patch
  // vnode -> element -> mountElement

  patch(subTree, container, instance);

  instance.vnode.el = subTree.el;
}
