import { effect, queueJobs } from "..";
import { EMPTY_OBJECT } from "../shared";
import { ShapeFlags } from "../shared/ShapeFlags";
import { createComponentInstance, setupComponent } from "./component";
import { createAppAPI } from "./createApp";
import { Fragment, Text } from "./vnode";
import { shouldUpdateComponent } from "./updateComponentUtils";

export function createRenderer(options) {
  const {
    createElement: hostCreateElement,
    patchProp: hostPatchProp,
    insert: hostInsert,
    remove: hostRemove,
    setElementText: hostSetElementText,
  } = options;

  function render(vnode, container) {
    patch(null, vnode, container, null, null);
  }

  function patch(n1, n2, container, parentComponent, anchor) {
    const { type } = n2;

    switch (type) {
      case Fragment:
        processFragment(n1, n2, container, parentComponent);
        break;

      case Text:
        processText(n1, n2, container);
        break;

      default:
        // 判断是不是 element
        if (n2.shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
          // 处理组件

          processComponent(n1, n2, container, parentComponent);
        } else if (n2.shapeFlag & ShapeFlags.ELEMENT /* 例如 'div'*/) {
          processElement(n1, n2, container, parentComponent, anchor);
        }
    }
  }

  function processText(n1, n2: any, container: any) {
    const el = (n2.el = document.createTextNode(n2.children));
    container.append(el);
  }

  function processFragment(n1, n2: any, container: any, parentComponent) {
    mountChildren(n2, container, parentComponent);
  }

  function processElement(
    n1,
    n2: any,
    container: any,
    parentComponent,
    anchor
  ) {
    if (!n1) {
      mountElement(n2, container, parentComponent, anchor);
    } else {
      patchElement(n1, n2, container, parentComponent, anchor);
    }
  }

  function mountElement(vnode, container, parentComponent, anchor) {
    const el = (vnode.el = hostCreateElement(vnode.type));

    const { children, shapeFlag } = vnode;

    // props
    const { props } = vnode;
    for (const key in props) {
      const val = props[key];

      hostPatchProp(el, key, null, val);
    }

    // children
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      el.textContent = children;
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      mountChildren(vnode.children, el, parentComponent);
    }

    hostInsert(el, container, anchor);
  }

  function patchElement(n1, n2, container, parentComponent, anchor) {
    const el = (n2.el = n1.el);

    if (anchor) {
      hostInsert(el, container, anchor);
    }

    const oldProps = n1.props || EMPTY_OBJECT;
    const newProps = n2.props || EMPTY_OBJECT;
    patchProps(el, oldProps, newProps);

    // 注意这里传 el 给 patchChildren 而不是 container
    patchChildren(n1, n2, el, parentComponent, anchor);
  }

  function patchProps(el, oldProps, newProps) {
    for (const key in newProps) {
      const prevProp = oldProps[key];
      const nextProp = newProps[key];

      if (prevProp !== nextProp) {
        // 当 prop 发生变化时调用 hostProp
        hostPatchProp(el, key, prevProp, nextProp);
      }
    }

    if (oldProps !== EMPTY_OBJECT) {
      for (const key in oldProps) {
        if (!(key in newProps)) {
          hostPatchProp(el, key, oldProps[key], null);
        }
      }
    }
  }

  function patchChildren(n1, n2, container, parentComponent, anchor) {
    const { shapeFlag: prevShapeFlag, children: c1 } = n1;
    const { shapeFlag: nextShapeFlag, children: c2 } = n2;

    if (nextShapeFlag & ShapeFlags.TEXT_CHILDREN) {
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        unmountChildren(c1);
      }

      if (c1 !== c2) {
        hostSetElementText(c2, container);
      }
    } else {
      if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
        hostSetElementText("", container);
        mountChildren(c2, container, parentComponent);
      } else {
        patchKeydChildren(c1, c2, container, parentComponent, anchor);
      }
    }
  }

  function unmountChildren(children) {
    for (const child of children) {
      const childNode = child.el;
      hostRemove(childNode);
    }
  }

  function mountChildren(children, container, parentComponent) {
    children.forEach((child) => {
      patch(null, child, container, parentComponent, null);
    });
  }

  function patchKeydChildren(
    c1: any[],
    c2: any[],
    container,
    parentComponent,
    parentAnchor
  ) {
    let j1 = c1.length - 1;
    let j2 = c2.length - 1;
    let i = 0;

    function isSameVNodeType(n1, n2) {
      return n1.type === n2.type && n1.key === n2.key;
    }

    // 左端对比
    while (i <= j1 && i <= j2) {
      const n1 = c1[i];
      const n2 = c2[i];

      if (!isSameVNodeType(n1, n2)) {
        break;
      }
      patch(n1, n2, container, parentComponent, parentAnchor);
      i++;
    }

    // 右端对比
    while (i <= j1 && i <= j2 && c1[j1].props.key === c2[j2].props.key) {
      const n1 = c1[j1];
      const n2 = c2[j2];

      if (!isSameVNodeType(n1, n2)) {
        break;
      }
      patch(n1, n2, container, parentComponent, parentAnchor);
      j1--;
      j2--;
    }

    // 首先, i 之前的部分可以确定是相同的; j1 和 j2 后面的部分不同
    if (i <= j1 && i <= j2) {
      // 当 i <= j1 且 i <= j2 时可以确定[i, j1] 和 [i, j2] 的部分需要处理
      // 将 c2[i, j2] 存到一个 map 中, 方便遍历[i, j1]时使用
      const keyToNewIndex = new Map();
      for (let idx = i; idx <= j2; idx++) {
        const nextChild = c2[idx];
        keyToNewIndex.set(nextChild.key, idx);
      }

      const toBePatched = j2 - i + 1;
      let patched = 0;
      const newIndexToOldIndexMap = new Array(toBePatched).fill(
        Number.MAX_SAFE_INTEGER
      );
      let needToMove = false;
      let maxNewIndexSoFar = 0;

      // 遍历[i, j1]
      for (let prevChildIndex = i; prevChildIndex <= j1; prevChildIndex++) {
        // 如果 c2 中间部分的所有元素都已经被 patch 了, 之后的 prevChild 都应该被删除
        const prevChild = c1[prevChildIndex];
        if (patched >= toBePatched) {
          hostRemove(prevChild.el);
          continue;
        }
        const key = prevChild.key;
        if (!keyToNewIndex.has(key)) {
          // 需要删除
          hostRemove(prevChild.el);
          continue;
        }

        const newIndex = keyToNewIndex.get(key);
        if (maxNewIndexSoFar <= newIndex) {
          maxNewIndexSoFar = newIndex;
        } else {
          needToMove = true;
        }
        newIndexToOldIndexMap[newIndex - i] = prevChildIndex;
        const nextChild = c2[newIndex];
        patch(prevChild, nextChild, container, parentComponent, null);
        patched++;
      }

      const longestIncreasingSequence = needToMove
        ? getSequence(
            newIndexToOldIndexMap.filter((n) => n !== Number.MAX_SAFE_INTEGER)
          )
        : [];

      for (
        let newIndex = toBePatched - 1,
          idx = longestIncreasingSequence.length - 1;
        newIndex >= 0;
        newIndex--
      ) {
        const nextChildIndex = newIndex + i;
        const nextChild = c2[nextChildIndex];
        const oldIndex = newIndexToOldIndexMap[newIndex];
        const anchor = c2[nextChildIndex + 1]?.el ?? null;
        if (oldIndex === Number.MAX_SAFE_INTEGER) {
          patch(null, nextChild, container, parentAnchor, anchor);
          continue;
        }
        if (needToMove) {
          if (newIndex === longestIncreasingSequence[idx] && idx >= 0) {
            idx--;
          } else {
            const prevChild =
              oldIndex === Number.MAX_SAFE_INTEGER ? null : c1[oldIndex];
            patch(prevChild, nextChild, container, parentAnchor, anchor);
          }
        }
      }
    } else if (i > j1) {
      // 此时 [i, j2] 的部分是 c2 多出来的部分.
      const anchor = c1[i]?.el;

      for (const n2 of c2.slice(i, j2 + 1)) {
        patch(null, n2, container, parentComponent, anchor);
      }
    } else {
      // 此时 [i, j1] 的部分是 c1 需要去除的部分.
      unmountChildren(c1.slice(i, j1 + 1));
    }
  }

  function processComponent(n1, n2: any, container, parentComponent) {
    if (n1 === null) {
      mountComponent(n2, container, parentComponent);
    } else {
      updateComponent(n1, n2);
    }
  }

  function mountComponent(initialVNode: any, container, parentComponent) {
    const instance = createComponentInstance(initialVNode, parentComponent);

    setupComponent(instance);
    setupRenderEffect(instance, container);
  }

  function updateComponent(n1, n2) {
    const instance = (n2.component = n1.component);
    if (shouldUpdateComponent(n1, n2)) {
      instance.next = n2;

      instance.update();
    } else {
      n2.component = n1.component;
      n2.el = n1.el;
      instance.vnode = n2;
    }
  }

  function setupRenderEffect(instance: any, container) {
    instance.update = effect(
      () => {
        if (instance.isInitializing) {
          const subTree = (instance.subTree = instance.render.call(
            instance.proxy,
            instance.proxy
          ));
          patch(null, subTree, container, instance, null);

          instance.vnode.el = subTree.el;
          instance.isInitializing = false;
        } else {
          const { next, vnode } = instance;
          if (next) {
            next.el = vnode.el;
            updateComponentPreRender(instance, next);
          }
          const prevSubTree = instance.subTree;
          const subTree = (instance.subTree = instance.render.call(
            instance.proxy,
            instance.proxy
          ));

          patch(prevSubTree, subTree, container, instance, null);
          instance.vnode.el = subTree.el;
        }
      },
      {
        scheduler() {
          queueJobs(instance.update);
        },
      }
    );
  }

  return {
    createApp: createAppAPI(render),
  };
}

function updateComponentPreRender(instance, nextVNode) {
  instance.vnode = nextVNode;
  instance.next = null;
  instance.props = nextVNode.props;
}

function getSequence(arr: number[]): number[] {
  const p = arr.slice();
  const result = [0];
  let i, j, u, v, c;
  const len = arr.length;
  for (i = 0; i < len; i++) {
    const arrI = arr[i];
    if (arrI !== 0) {
      j = result[result.length - 1];
      if (arr[j] < arrI) {
        p[i] = j;
        result.push(i);
        continue;
      }
      u = 0;
      v = result.length - 1;
      while (u < v) {
        c = (u + v) >> 1;
        if (arr[result[c]] < arrI) {
          u = c + 1;
        } else {
          v = c;
        }
      }
      if (arrI < arr[result[u]]) {
        if (u > 0) {
          p[i] = result[u - 1];
        }
        result[u] = i;
      }
    }
  }
  u = result.length;
  v = result[u - 1];
  while (u-- > 0) {
    result[u] = v;
    v = p[v];
  }
  return result;
}
