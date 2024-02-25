import { h, renderSlot, createTextVNode } from "../../../lib/guide-mini-vue.esm.js";
export default {
  setup() {
    return {};
  },
  render() {
    const foo = h("p", {}, "foo");

    const age = 18;

    return h("div", {}, [
      renderSlot(this.$slots, 'header', {
        age
      }),
      foo,
      renderSlot(this.$slots, 'footer'),
      createTextVNode('persist'),
    ]
    );
  }
};
