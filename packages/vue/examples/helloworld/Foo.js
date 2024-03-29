import { h } from '../../dist/my-mini-vue3.esm.js'

export const Foo = {
  setup(props) {
    console.log(props);

    // readonly
    props.count++;
    console.log(props);
  },
  render() {
    return h("div", {}, "foo:" + this.count);
  }
}