import { ReactiveEffect } from "./effect";

class ComputedRefImpl {
  private _dirty = true;
  private _effect;
  private _value;
  constructor(getter) {
    this._effect = new ReactiveEffect(getter, () => {
      // 当依赖更新时通知 computed 对象
      if (!this._dirty) {
        this._dirty = true;
      }
    });
  }

  get value() {
    if (this._dirty) {
      // 依赖有更新, 需要重新执行 getter

      // 需要等到下一次依赖更新
      this._dirty = false;

      // 这时候 getter 访问到的都是已经更新后的依赖值了
      this._value = this._effect.run();
      return this._value;
    }

    // 依赖没有更新, 直接返回旧的值
    return this._value;
  }
}

export function computed(getter) {
  return new ComputedRefImpl(getter);
}
