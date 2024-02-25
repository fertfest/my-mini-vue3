import { extend } from "@my-mini-vue3/shared";

export class ReactiveEffect {
  private _fn: any;
  private _firstRun: boolean = true;
  private _effectsArray: any[] = [];
  onStop?: () => void;
  public scheduler?: () => void;

  constructor(fn, scheduler?) {
    this._fn = fn;
    if (scheduler) {
      this.scheduler = scheduler;
    }
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
    // 在执行功能函数之前设置当前 ReactiveEffect 为 activeEffect
    activeEffect = this;
    return this._fn();
  }
}

export let activeEffect: any = undefined;

export function setActiveEffect(effect: any) {
  activeEffect = effect;
}

/**
 * 接收一个函数 fn 并执行它, 在首次执行时, 函数内部被访问的响应式变量都会 track 包装该函数的 effect(ReactiveEffect).
 * 这样, 当响应式变量的值更改并触发依赖时, ReactiveEffect 内部的 fn 会被再次执行.
 * @param fn 一个函数
 * @param options 可能包含 scheduler, onStop ...
 * @returns
 */
export function effect(fn, options?: any) {
  const _effect = new ReactiveEffect(fn);

  extend(_effect, options);

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

  trackActiveEffect(effects);

  activeEffect = undefined;
}

export function trackActiveEffect(dep) {
  if (!isTracking()) {
    return;
  }
  // 防止重复添加
  if (dep.has(activeEffect)) return;

  dep.add(activeEffect);
  activeEffect.pushEffects(dep);
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
  triggerEffects(effects);
}

export function triggerEffects(effects) {
  for (const effect of effects) {
    if (effect.scheduler) {
      effect.scheduler();
    } else {
      effect.run();
    }
  }
}

export function isTracking() {
  return activeEffect !== undefined;
}
