import { createVNode } from "./vnode";

export function createAppAPI(render) {
  return function createApp(rootComponent: any) {
    return {
      mount(rootContainer) {
        // component -> vnode
        // 所有的逻辑操作都基于 vnode 进行

        const vnode = createVNode(rootComponent);

        render(vnode, rootContainer);
      },
    };
  };
}
