import { extend } from "../shared";

class ReactiveEffect {
  private _fn: any;
  private _firstRun: boolean = true;
  private _effectsArray: any[] = [];
  onStop?: () => void;
  scheduler?: () => void;

  constructor(fn) {
    this._fn = fn;
  }

  pushEffects(effects) {
    this._effectsArray.push(effects);
  }

  stop() {
    if (this.onStop) {
      this.onStop();
    }

    if (this._effectsArray.length === 0) {
      return;
    }

    // 对于每一个 effects, 都从 effects 中清除当前 effect(this)
    for (const effects of this._effectsArray) {
      effects.delete(this);
    }

    this._effectsArray = [];
  }

  run() {
    if (this._firstRun) {
      this._firstRun = false;
      this._fn();
      return;
    }

    if (this.scheduler) {
      this.scheduler();
    } else {
      this._fn();
    }
  }
}

let activeEffect: any = undefined;

export function effect(fn, options?: any) {
  const _effect = new ReactiveEffect(fn);

  extend(_effect, options);

  // 只有执行 effect 函数的时候才设置 activeEffect
  activeEffect = _effect;

  _effect.run();

  const res = fn.bind(_effect);
  res.effect = _effect;
  return res;
}

export function stop(runner: any) {
  const _effect = runner.effect;
  _effect.stop();
}

const targetMap = new Map<any, any>();
export function track(target, key) {
  if (!activeEffect) {
    return;
  }

  // 先通过 targetMap.get(target) 找到 Map<key, effects>
  let keyMap: Map<any, any> = targetMap.get(target);
  if (!keyMap) {
    // target 对应的 map 还没有被创建, 需要创建
    keyMap = new Map();

    // 创建后需要将对应的 map 添加到targetMap中
    targetMap.set(target, keyMap);
  }

  let effects: Set<any> = keyMap.get(key);
  if (!effects) {
    // 同样如果 key 对应的 set 不存在, 需要创建
    effects = new Set();
    keyMap.set(key, effects);
  }

  // 最后将新的 effect 添加到 effects中
  effects.add(activeEffect);

  // 将 effects 存到 activeEffect 的 effectsArray 中
  activeEffect.pushEffects(effects);

  activeEffect = undefined;
}

export function trigger(target, key) {
  if (!target || !key) {
    return;
  }

  const keyMap = targetMap.get(target);
  if (!keyMap) {
    return;
  }

  const effects = keyMap.get(key);
  if (!effects) {
    return;
  }

  for (const effect of effects) {
    effect.run();
  }
}
