'use strict';

const Fragment = Symbol("Fragment");
const Text = Symbol("Text");
function createVNode(type, props, children) {
    const vnode = {
        type,
        props,
        children,
        shapeFlag: getShapeFlag(type),
        key: props === null || props === void 0 ? void 0 : props.key,
        el: null,
    };
    // shapeFlag about children
    if (Array.isArray(children)) {
        vnode.shapeFlag |= 8 /* ShapeFlags.ARRAY_CHILDREN */;
    }
    else if (typeof children === "string") {
        vnode.shapeFlag |= 4 /* ShapeFlags.TEXT_CHILDREN */;
    }
    if (vnode.shapeFlag & 2 /* ShapeFlags.STATEFUL_COMPONENT */) {
        if (typeof children === "object") {
            vnode.shapeFlag |= 16 /* ShapeFlags.SLOT_CHILDREN */;
        }
    }
    return vnode;
}
function createTextVNode(text) {
    return createVNode(Text, {}, text);
}
function getShapeFlag(type) {
    return typeof type === "string"
        ? 1 /* ShapeFlags.ELEMENT */
        : 2 /* ShapeFlags.STATEFUL_COMPONENT */;
}

function h(type, props, children) {
    return createVNode(type, props, children);
}

function renderSlot(slots, name, prop) {
    const slot = slots[name];
    if (slot) {
        if (typeof slot === "function") {
            return createVNode(Fragment, {}, slot(prop));
        }
    }
}

const extend = Object.assign;
const EMPTY_OBJECT = {};
function isObject(val) {
    return typeof val === "object" && val !== null;
}
function hasChanged(val, newVal) {
    return !Object.is(newVal, val);
}
function hasOwn(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
}
function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

class ReactiveEffect {
    constructor(fn, scheduler) {
        this._firstRun = true;
        this._effectsArray = [];
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
let activeEffect = undefined;
/**
 * 接收一个函数 fn 并执行它, 在首次执行时, 函数内部被访问的响应式变量都会 track 包装该函数的 effect(ReactiveEffect).
 * 这样, 当响应式变量的值更改并触发依赖时, ReactiveEffect 内部的 fn 会被再次执行.
 * @param fn 一个函数
 * @param options 可能包含 scheduler, onStop ...
 * @returns
 */
function effect(fn, options) {
    const _effect = new ReactiveEffect(fn);
    extend(_effect, options);
    _effect.run();
    const res = fn.bind(_effect);
    res.effect = _effect;
    return res;
}
const targetMap = new Map();
function track(target, key) {
    if (!activeEffect) {
        return;
    }
    // 先通过 targetMap.get(target) 找到 Map<key, effects>
    let keyMap = targetMap.get(target);
    if (!keyMap) {
        // target 对应的 map 还没有被创建, 需要创建
        keyMap = new Map();
        // 创建后需要将对应的 map 添加到targetMap中
        targetMap.set(target, keyMap);
    }
    let effects = keyMap.get(key);
    if (!effects) {
        // 同样如果 key 对应的 set 不存在, 需要创建
        effects = new Set();
        keyMap.set(key, effects);
    }
    trackActiveEffect(effects);
    activeEffect = undefined;
}
function trackActiveEffect(dep) {
    if (!isTracking()) {
        return;
    }
    // 防止重复添加
    if (dep.has(activeEffect))
        return;
    dep.add(activeEffect);
    activeEffect.pushEffects(dep);
}
function trigger(target, key) {
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
function triggerEffects(effects) {
    for (const effect of effects) {
        if (effect.scheduler) {
            effect.scheduler();
        }
        else {
            effect.run();
        }
    }
}
function isTracking() {
    return activeEffect !== undefined;
}

const get = createGetter();
const set = createSetter();
const readonlyGet = createGetter(true);
const shallowReadonlyGet = createGetter(true, true);
function createGetter(isReadonly = false, isShallow = false) {
    return function (target, key) {
        if (key === "__v_isReactive" /* ReactiveFlags.IS_REACTIVE */) {
            return !isReadonly;
        }
        else if (key === "__v_isReadonly" /* ReactiveFlags.IS_READONLY */) {
            return isReadonly;
        }
        let res = Reflect.get(target, key);
        if (isObject(res) && !isShallow) {
            return isReadonly ? readonly(res) : reactive(res);
        }
        if (!isReadonly) {
            track(target, key);
        }
        return res;
    };
}
function createSetter() {
    return function set(target, key, value) {
        const res = Reflect.set(target, key, value);
        trigger(target, key);
        return res;
    };
}
const mutableHandlers = {
    get,
    set,
};
const readonlyHandlers = {
    get: readonlyGet,
    set(target, key, value) {
        console.warn(`mini-vue warn --- key:${key} set 失败, 原因: target 为 readonly 对象`, target);
        return true;
    },
};
const shallowReadonlyHandlers = extend({}, readonlyHandlers, {
    get: shallowReadonlyGet,
});

function reactive(target) {
    return createReactiveObject(target, mutableHandlers);
}
function readonly(target) {
    return createReactiveObject(target, readonlyHandlers);
}
function shallowReadonly(target) {
    return createReactiveObject(target, shallowReadonlyHandlers);
}
function createReactiveObject(target, baseHandlers) {
    if (!isObject(target)) {
        console.warn(`target ${target} 必须是一个对象`);
        return target;
    }
    return new Proxy(target, baseHandlers);
}

function initProps(instance, rawProps) {
    instance.props = rawProps || {};
    // attrs
}

const publicPropertiesMap = {
    $el: (i) => i.vnode.el,
    $slots: (i) => i.slots,
};
const publicInstanceProxyHandlers = {
    get({ _: instance }, key) {
        const { setupState, props } = instance;
        if (hasOwn(setupState, key)) {
            return setupState[key];
        }
        if (hasOwn(props, key)) {
            return props[key];
        }
        const publicGetter = publicPropertiesMap[key];
        if (publicGetter) {
            return publicGetter(instance);
        }
    },
};

const emit = (instance, event, ...rest) => {
    let eventName = "on";
    let dashIndex = event.indexOf("-");
    while (dashIndex !== -1) {
        const firstWord = event.slice(0, dashIndex);
        event = event.slice(dashIndex + 1);
        eventName += capitalizeFirst(firstWord);
        dashIndex = event.indexOf("-");
    }
    eventName += capitalizeFirst(event);
    if (hasOwn(instance.props, eventName)) {
        instance.props[eventName](...rest);
    }
};

function initSlots(instance, children) {
    const { vnode } = instance;
    if (vnode.shapeFlag & 16 /* ShapeFlags.SLOT_CHILDREN */) {
        normalizeObjectSlots(children, instance.slots);
    }
}
function normalizeObjectSlots(children, slots) {
    for (const key in children) {
        const value = children[key];
        // slot
        slots[key] = (props) => normalizeSlotValue(value(props));
    }
}
function normalizeSlotValue(value) {
    return Array.isArray(value) ? value : [value];
}

function createComponentInstance(vnode, parent) {
    const instance = {
        vnode,
        type: vnode.type,
        setupState: {},
        props: {},
        emit: (str) => { },
        parent,
        // provides: parent ? parent.provides : {},
        provides: parent ? Object.create(parent.provides) : {},
        slots: {},
        isInitializing: true,
        subTree: null,
    };
    instance.emit = emit.bind(null, instance);
    return instance;
}
function setupComponent(instance) {
    initProps(instance, instance.vnode.props);
    initSlots(instance, instance.vnode.children);
    setupStatefulComponent(instance);
}
function setupStatefulComponent(instance) {
    const Component = instance.type;
    instance.proxy = new Proxy({ _: instance }, publicInstanceProxyHandlers);
    const { setup } = Component;
    if (setup) {
        setCurrentInstance(instance);
        const setupResult = setup(shallowReadonly(instance.props), {
            emit: instance.emit,
        });
        setCurrentInstance(null);
        handleSetupResult(instance, setupResult);
    }
}
function handleSetupResult(instance, setupResult) {
    // function Object
    // TODO: function
    if (typeof setupResult === "object") {
        instance.setupState = proxyRefs(setupResult);
    }
    finishComponentSetup(instance);
}
function finishComponentSetup(instance) {
    const Component = instance.type;
    if (Component.render) {
        instance.render = Component.render;
    }
}
let currentInstance = null;
function getCurrentInstance() {
    return currentInstance;
}
function setCurrentInstance(instance) {
    currentInstance = instance;
}

function inject(key, defaultValue) {
    const currentInstance = getCurrentInstance();
    if (currentInstance) {
        const parentProvides = currentInstance.parent.provides;
        if (key in parentProvides) {
            return parentProvides[key];
        }
        else if (defaultValue) {
            if (typeof defaultValue === "function") {
                return defaultValue();
            }
            return defaultValue;
        }
    }
    // const currentInstance = getCurrentInstance();
    // let instancePointer = currentInstance;
    // let parentProvides = instancePointer.parent.provides;
    // if (currentInstance) {
    //   while (parentProvides && parentProvides[key] === undefined) {
    //     instancePointer = instancePointer.parent;
    //     parentProvides = instancePointer.parent?.provides;
    //   }
    // }
    // if (parentProvides && parentProvides[key]) {
    //   return parentProvides[key];
    // }
    // if (defaultValue === undefined) {
    //   return undefined;
    // }
    // if (typeof defaultValue === "function") {
    //   return defaultValue();
    // }
    // return defaultValue;
}
function provide(key, value) {
    const currentInstance = getCurrentInstance();
    if (currentInstance) {
        let { provides } = currentInstance;
        // const parentProvides = currentInstance.parent.provides;
        // if (provides === parentProvides) {
        //   provides = currentInstance.provides = Object.create(parentProvides);
        // }
        provides[key] = value;
    }
}

function createAppAPI(render) {
    return function createApp(rootComponent) {
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

function createRenderer(options) {
    const { createElement: hostCreateElement, patchProp: hostPatchProp, insert: hostInsert, remove: hostRemove, setElementText: hostSetElementText, } = options;
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
                if (n2.shapeFlag & 2 /* ShapeFlags.STATEFUL_COMPONENT */) {
                    // 处理组件
                    processComponent(n1, n2, container, parentComponent);
                }
                else if (n2.shapeFlag & 1 /* ShapeFlags.ELEMENT */ /* 例如 'div'*/) {
                    processElement(n1, n2, container, parentComponent, anchor);
                }
        }
    }
    function processText(n1, n2, container) {
        const el = (n2.el = document.createTextNode(n2.children));
        container.append(el);
    }
    function processFragment(n1, n2, container, parentComponent) {
        mountChildren(n2, container, parentComponent);
    }
    function processElement(n1, n2, container, parentComponent, anchor) {
        if (!n1) {
            mountElement(n2, container, parentComponent, anchor);
        }
        else {
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
        if (shapeFlag & 4 /* ShapeFlags.TEXT_CHILDREN */) {
            el.textContent = children;
        }
        else if (shapeFlag & 8 /* ShapeFlags.ARRAY_CHILDREN */) {
            mountChildren(vnode.children, el, parentComponent);
        }
        hostInsert(el, container, anchor);
    }
    function patchElement(n1, n2, container, parentComponent, anchor) {
        const el = (n2.el = n1.el);
        if (anchor) {
            hostInsert(el, container, anchor);
        }
        console.log("patchElement");
        console.log(container);
        console.log(n1, n2);
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
        console.log("container patchChildren", container);
        if (nextShapeFlag & 4 /* ShapeFlags.TEXT_CHILDREN */) {
            if (prevShapeFlag & 8 /* ShapeFlags.ARRAY_CHILDREN */) {
                unmountChildren(c1);
            }
            if (c1 !== c2) {
                hostSetElementText(c2, container);
            }
        }
        else {
            if (prevShapeFlag & 4 /* ShapeFlags.TEXT_CHILDREN */) {
                hostSetElementText("", container);
                mountChildren(c2, container, parentComponent);
            }
            else {
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
    function patchKeydChildren(c1, c2, container, parentComponent, parentAnchor) {
        var _a, _b, _c;
        console.log("patchKeydChildren", c1, c2, container, parentComponent);
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
            const newIndexToOldIndexMap = new Array(toBePatched).fill(Number.MAX_SAFE_INTEGER);
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
                }
                else {
                    needToMove = true;
                }
                newIndexToOldIndexMap[newIndex - i] = prevChildIndex;
                const nextChild = c2[newIndex];
                patch(prevChild, nextChild, container, parentComponent, null);
                patched++;
            }
            const longestIncreasingSequence = needToMove
                ? getSequence(newIndexToOldIndexMap.filter((n) => n !== Number.MAX_SAFE_INTEGER))
                : [];
            for (let newIndex = toBePatched - 1, idx = longestIncreasingSequence.length - 1; newIndex >= 0; newIndex--) {
                const nextChildIndex = newIndex + i;
                const nextChild = c2[nextChildIndex];
                const oldIndex = newIndexToOldIndexMap[newIndex];
                const anchor = (_b = (_a = c2[nextChildIndex + 1]) === null || _a === void 0 ? void 0 : _a.el) !== null && _b !== void 0 ? _b : null;
                if (oldIndex === Number.MAX_SAFE_INTEGER) {
                    patch(null, nextChild, container, parentAnchor, anchor);
                    continue;
                }
                if (needToMove) {
                    if (newIndex === longestIncreasingSequence[idx] && idx >= 0) {
                        idx--;
                    }
                    else {
                        console.log("move or update");
                        const prevChild = oldIndex === Number.MAX_SAFE_INTEGER ? null : c1[oldIndex];
                        patch(prevChild, nextChild, container, parentAnchor, anchor);
                    }
                }
            }
        }
        else if (i > j1) {
            // 此时 [i, j2] 的部分是 c2 多出来的部分.
            const anchor = (_c = c1[i]) === null || _c === void 0 ? void 0 : _c.el;
            for (const n2 of c2.slice(i, j2 + 1)) {
                patch(null, n2, container, parentComponent, anchor);
            }
        }
        else {
            // 此时 [i, j1] 的部分是 c1 需要去除的部分.
            unmountChildren(c1.slice(i, j1 + 1));
        }
    }
    function processComponent(n1, n2, container, parentComponent) {
        if (n1 === null) {
            mountComponent(n2, container, parentComponent);
        }
    }
    function mountComponent(initialVNode, container, parentComponent) {
        const instance = createComponentInstance(initialVNode, parentComponent);
        setupComponent(instance);
        setupRenderEffect(instance, container);
    }
    function setupRenderEffect(instance, container) {
        effect(() => {
            if (instance.isInitializing) {
                const subTree = (instance.subTree = instance.render.call(instance.proxy));
                patch(null, subTree, container, instance, null);
                instance.vnode.el = subTree.el;
                instance.isInitializing = false;
            }
            else {
                const prevSubTree = instance.subTree;
                const subTree = (instance.subTree = instance.render.call(instance.proxy));
                patch(prevSubTree, subTree, container, instance, null);
                instance.vnode.el = subTree.el;
            }
        });
    }
    return {
        createApp: createAppAPI(render),
    };
}
function getSequence(arr) {
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
                }
                else {
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

function createElement(type) {
    return document.createElement(type);
}
function patchProp(el, key, prevProp, nextProp) {
    const isOn = /^on[A-Z]/.test(key);
    if (nextProp === undefined || nextProp === null) {
        el.removeAttribute(key);
    }
    else {
        if (isOn) {
            const event = key.slice(2).toLowerCase();
            el.addEventListener(event, nextProp);
        }
        else {
            el.setAttribute(key, nextProp);
        }
    }
}
function insert(el, container, anchor) {
    container.insertBefore(el, anchor);
}
function remove(childNode) {
    const parent = childNode.parentNode;
    if (parent) {
        parent.removeChild(childNode);
    }
}
function setElementText(text, container) {
    container.textContent = text;
}
const renderer = createRenderer({
    createElement,
    patchProp,
    insert,
    remove,
    setElementText,
});
function createApp(rootComponent) {
    return renderer.createApp(rootComponent);
}

const isRefSymbol = Symbol();
class RefImpl {
    constructor(value) {
        this._value = isObject(value) ? reactive(value) : value;
        this._rawValue = value;
        this.dep = new Set();
    }
    get value() {
        trackActiveEffect(this.dep);
        return this._value;
    }
    get [isRefSymbol]() {
        return true;
    }
    set value(newValue) {
        if (!hasChanged(newValue, this._rawValue))
            return;
        this._value = isObject(newValue) ? reactive(newValue) : newValue;
        this._rawValue = newValue;
        triggerEffects(this.dep);
    }
}
function ref(target) {
    return new RefImpl(target);
}
function isRef(mayBeRef) {
    return !!mayBeRef[isRefSymbol];
}
function unRef(mayBeRef) {
    return isRef(mayBeRef) ? mayBeRef.value : mayBeRef;
}
/**
 * 当对代理对象进行 get 操作时, 如果访问的是 ref, 代理对象会直接返回 ref 所保存的值, 而不是 ref 本身.
 * 当对代理对象进行 set 操作时, 如果 set 的是 ref, 并且 newValue 是非 ref, 会直接将 newValue 设置给 ref 的值而不是替换 ref.
 * @param original 需要代理的对象
 * @returns 返回一个代理对象
 */
function proxyRefs(original) {
    return new Proxy(original, {
        get(target, key) {
            // const mayBeRefRes = Reflect.get(target, key);
            // if (isRef(mayBeRefRes)) {
            //   return mayBeRefRes.value;
            // }
            // return mayBeRefRes;
            return unRef(Reflect.get(target, key));
        },
        set(target, key, newValue) {
            const mayBeRef = target[key];
            if (isRef(mayBeRef) && !isRef(newValue)) {
                mayBeRef.value = newValue;
            }
            else {
                target[key] = newValue;
            }
            return true;
        },
    });
}

exports.createApp = createApp;
exports.createRenderer = createRenderer;
exports.createTextVNode = createTextVNode;
exports.effect = effect;
exports.getCurrentInstance = getCurrentInstance;
exports.h = h;
exports.inject = inject;
exports.provide = provide;
exports.proxyRefs = proxyRefs;
exports.ref = ref;
exports.renderSlot = renderSlot;
