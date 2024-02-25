import { h } from '../../dist/my-mini-vue3.esm.js'
import { Foo } from './Foo.js'

window.self = null;
export const App = {
  render() {
    window.self = this;
    return h("div",
      {
        id: "root",
        class: ["red", "hard"],
        onClick() {
          console.log('click');
        },
        onMousedown() {
          console.log('mousedown');
        }
      },
      [
        h("div", {}, "hi," + this.msg),
        h(Foo, {
          count: 1,
        }),
      ]
      // "hi, mini-vue"
      // [h("p", { class: "red" }, "hi"), h("p", { class: "blue" }, "mini-vue")]
    );
  },

  setup() {
    return {
      msg: "mini-vue-hhh",
    }
  },
}