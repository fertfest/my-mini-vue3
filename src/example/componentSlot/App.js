import { h, ref, reactive } from "../../dist/mini-vue.esm-bundler.js";
import Child from "./Child.js";

export default {
  name: "App",
  render() {
    const app = h("div", {}, "App");
    const foo = h(Child, {}, h("p", {}, "123"));

    return h("div", {}, [app, foo]);
  },

  setup() {
    return {};
  },
};
