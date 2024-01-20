import { h, ref, reactive, renderSlot } from "../../dist/mini-vue.esm-bundler.js";
export default {
  setup() {
    return {};
  },
  render() {
    const foo = h("p", {}, "foo");

    return h("div", {}, [foo]);
  }
};
