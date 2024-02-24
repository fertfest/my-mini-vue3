const Fragment = Symbol("Fragment");
const Text = Symbol("Text");
function createVNode(type, props, children) {
    const vnode = {
        type,
        props,
        children,
        component: null,
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

function toDisplayString(value) {
    return String(value);
}

const extend = Object.assign;
const EMPTY_OBJECT = {};
function isObject(val) {
    return typeof val === "object" && val !== null;
}
function isString(val) {
    return typeof val === "string";
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
    $props: (i) => i.props,
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
        next: null,
        update: null,
        // provides: parent ? parent.provides : {},
        provides: parent ? Object.create(parent.provides) : {},
        slots: {},
        isInitializing: true,
        subTree: null,
    };
    vnode.component = instance;
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
    if (compiler && !Component.render) {
        if (Component.template) {
            Component.render = compiler(Component.template);
        }
    }
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
let compiler;
function registerRuntimeCompiler(_compiler) {
    compiler = _compiler;
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

function shouldUpdateComponent(prevVNode, nextVNode) {
    const { props: prevProps } = prevVNode;
    const { props: nextProps } = nextVNode;
    for (const key in prevProps) {
        if (prevProps[key] !== nextProps[key]) {
            return true;
        }
    }
    return false;
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
        else {
            updateComponent(n1, n2);
        }
    }
    function mountComponent(initialVNode, container, parentComponent) {
        const instance = createComponentInstance(initialVNode, parentComponent);
        setupComponent(instance);
        setupRenderEffect(instance, container);
    }
    function updateComponent(n1, n2) {
        const instance = (n2.component = n1.component);
        if (shouldUpdateComponent(n1, n2)) {
            instance.next = n2;
            instance.update();
        }
        else {
            n2.component = n1.component;
            n2.el = n1.el;
            instance.vnode = n2;
        }
    }
    function setupRenderEffect(instance, container) {
        instance.update = effect(() => {
            if (instance.isInitializing) {
                const subTree = (instance.subTree = instance.render.call(instance.proxy, instance.proxy));
                patch(null, subTree, container, instance, null);
                instance.vnode.el = subTree.el;
                instance.isInitializing = false;
            }
            else {
                const { next, vnode } = instance;
                if (next) {
                    next.el = vnode.el;
                    updateComponentPreRender(instance, next);
                }
                const prevSubTree = instance.subTree;
                const subTree = (instance.subTree = instance.render.call(instance.proxy, instance.proxy));
                patch(prevSubTree, subTree, container, instance, null);
                instance.vnode.el = subTree.el;
            }
        }, {
            scheduler() {
                queueJobs(instance.update);
            },
        });
    }
    return {
        createApp: createAppAPI(render),
    };
}
function updateComponentPreRender(instance, nextVNode) {
    instance.vnode = nextVNode;
    instance.next = null;
    instance.props = nextVNode.props;
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

const queue = [];
let flushing = false;
function nextTick(fn) {
    return fn ? Promise.resolve().then(fn) : Promise.resolve();
}
function queueJobs(job) {
    if (!queue.includes(job)) {
        queue.push(job);
    }
    if (!flushing) {
        queueFlush();
    }
}
function queueFlush() {
    if (flushing) {
        return;
    }
    flushing = true;
    nextTick(flushJobs);
}
function flushJobs() {
    flushing = false;
    let job;
    while ((job = queue.shift())) {
        job && job();
    }
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

var runtimeDom = /*#__PURE__*/Object.freeze({
    __proto__: null,
    createApp: createApp,
    createElementVNode: createVNode,
    createRenderer: createRenderer,
    createTextVNode: createTextVNode,
    effect: effect,
    getCurrentInstance: getCurrentInstance,
    h: h,
    inject: inject,
    nextTick: nextTick,
    provide: provide,
    proxyRefs: proxyRefs,
    queueJobs: queueJobs,
    ref: ref,
    registerRuntimeCompiler: registerRuntimeCompiler,
    renderSlot: renderSlot,
    toDisplayString: toDisplayString
});

const TO_DISPLAY_STRING = Symbol("toDisplayString");
const CREATE_ELEMENT_VNODE = Symbol("createElementVNode");
const helperNameMap = {
    [TO_DISPLAY_STRING]: "toDisplayString",
    [CREATE_ELEMENT_VNODE]: "createElementVNode",
};

function transform(root, options = {}) {
    const context = createTransformContext(root, options);
    traverseNode(root, context);
    createRootCodegen(root);
    root.helpers = [...context.helpers];
}
function createTransformContext(root, options) {
    var _a;
    const context = {
        root,
        nodeTransforms: (_a = options.nodeTransforms) !== null && _a !== void 0 ? _a : [],
        helpers: new Set(),
        addHelper(newHelper) {
            context.helpers.add(newHelper);
        },
    };
    return context;
}
function traverseNode(node, context) {
    const { nodeTransforms, addHelper } = context;
    const exitFns = [];
    for (const t of nodeTransforms) {
        const onExit = t(node, context);
        if (onExit)
            exitFns.push(onExit);
    }
    switch (node.type) {
        case 0 /* NodeTypes.INTERPOLATION */:
            addHelper(TO_DISPLAY_STRING);
            break;
        case 4 /* NodeTypes.ROOT */:
        case 2 /* NodeTypes.ELEMENT */:
            traverseChildren(node, context);
            break;
    }
    for (const fn of [...exitFns].reverse()) {
        fn();
    }
}
function traverseChildren(node, context) {
    const children = node.children;
    if (children) {
        for (const child of children) {
            traverseNode(child, context);
        }
    }
}
function createRootCodegen(root) {
    const child = root.children[0];
    if (child.type === 2 /* NodeTypes.ELEMENT */) {
        root.codegenNode = child.codegenNode;
    }
    else {
        root.codegenNode = child;
    }
}

function generate(ast) {
    const context = createGenerateContext();
    const { push } = context;
    genFunctionPreamble(ast, context);
    push("return ");
    const args = ["_ctx", "_cache"];
    const functionName = "render";
    const signature = `${functionName}(${args.join(",")})`;
    push("function " + signature + "{ return ");
    transform(ast);
    genNode(ast.codegenNode, context);
    push(" }");
    return {
        code: context.code,
    };
}
function genFunctionPreamble(ast, context) {
    const { push } = context;
    if (ast.helpers.length > 0) {
        const VueBinging = "Vue\n";
        const aliasHelper = (s) => `${helperNameMap[s]}: _${helperNameMap[s]}`;
        push(`const { ${ast.helpers.map(aliasHelper).join(", ")} } = ${VueBinging}`);
    }
}
function genNode(node, context) {
    switch (node.type) {
        case 3 /* NodeTypes.TEXT */:
            genText(node, context);
            break;
        case 0 /* NodeTypes.INTERPOLATION */:
            genInterpolation(node, context);
            break;
        case 1 /* NodeTypes.SIMPLE_EXPRESSION */:
            genExpression(node, context);
            break;
        case 2 /* NodeTypes.ELEMENT */:
            genElement(node, context);
            break;
        case 5 /* NodeTypes.COMPOUND_EXPRESSION */:
            genCompoundExpression(node, context);
    }
}
function genText(node, context) {
    const { push } = context;
    push(`'${node.content}'`);
}
function genInterpolation(node, context) {
    const { push, helper } = context;
    push(`${helper(TO_DISPLAY_STRING)}(`);
    genNode(node.content, context);
    push(")");
}
function genExpression(node, context) {
    const { push } = context;
    push(`${node.content}`);
}
function genElement(node, context) {
    const { push, helper } = context;
    const { tag, children, props } = node;
    push(`${helper(CREATE_ELEMENT_VNODE)}(`);
    genNodeList(genNullable([tag, props, children]), context);
    // genNode(children, context);
    push(")");
}
function genNodeList(nodes, context) {
    const { push } = context;
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (isString(node)) {
            push(node);
        }
        else {
            genNode(node, context);
        }
        if (i !== nodes.length - 1) {
            push(", ");
        }
    }
}
function genNullable(args) {
    return args.map((arg) => arg || "null");
}
function createGenerateContext(ast) {
    const context = {
        code: "",
        push(str) {
            context.code += str;
        },
        helper(key) {
            return `_${helperNameMap[key]}`;
        },
    };
    return context;
}
function genCompoundExpression(node, context) {
    const { push } = context;
    for (const child of node.children) {
        if (isString(child)) {
            push(child);
        }
        else {
            genNode(child, context);
        }
    }
}

function baseParse(content) {
    const context = createParserContext(content);
    return createRoot(parseChildren(context));
}
function parseChildren(context) {
    const nodes = [];
    while (context.source && context.source.length > 0) {
        const { source } = context;
        let node;
        if (source.startsWith("{{")) {
            node = parseInterpolation(context);
        }
        else if (source.startsWith("<")) {
            node = parseElement(context);
        }
        else {
            node = parseText(context);
        }
        nodes.push(node);
    }
    return nodes;
}
function parseInterpolation(context) {
    const openDelimiter = "{{";
    if (!context.source.startsWith(openDelimiter)) {
        throw new Error("parseInterpolation --- source doesn't start with {{!");
    }
    const closeDelimiter = "}}";
    advanceBy(context, openDelimiter.length);
    const closeIndex = context.source.indexOf(closeDelimiter);
    if (closeIndex === -1) {
        throw new Error("parseInterpolation --- source doesn't include }}!");
    }
    const value = parseTextData(context, closeIndex).trim();
    advanceBy(context, closeDelimiter.length);
    return {
        type: 0 /* NodeTypes.INTERPOLATION */,
        content: {
            type: 1 /* NodeTypes.SIMPLE_EXPRESSION */,
            content: value,
        },
    };
}
function advanceBy(context, length) {
    context.source = context.source.slice(length);
}
function createRoot(children) {
    return {
        children,
        type: 4 /* NodeTypes.ROOT */,
        helpers: [],
    };
}
function createParserContext(content) {
    return {
        source: content,
    };
}
function parseElement(context) {
    const beginSign = "<";
    const endSign = ">";
    const selfClosedSign = "/";
    const openTagEndIndex = context.source.indexOf(endSign);
    const tagName = context.source.slice(beginSign.length, openTagEndIndex);
    advanceBy(context, openTagEndIndex + 1);
    // 自闭和标签
    if (tagName.startsWith(selfClosedSign)) {
        return {
            type: 2 /* NodeTypes.ELEMENT */,
            tag: tagName.slice(selfClosedSign.length),
            tagType: 0 /* ElementTypes.ELEMENT */,
            children: [],
        };
    }
    // 非自闭和标签
    const closeTag = `${beginSign}${selfClosedSign}${tagName}${endSign}`;
    const openTag = `${beginSign}${tagName}${endSign}`;
    let closeTagIndex = -1;
    let openTagIndex = -1;
    while (true) {
        closeTagIndex = context.source.indexOf(closeTag, closeTagIndex + 1);
        openTagIndex = context.source.indexOf(openTag, openTagEndIndex + 1);
        if (closeTagIndex !== -1 &&
            (openTagIndex === -1 || openTagIndex > closeTagIndex)) {
            break;
        }
        else {
            openTagIndex = closeTagIndex = closeTagIndex + closeTag.length;
            if (openTagIndex >= context.source.length) {
                throw new Error(`缺失结束标签：${tagName}`);
            }
        }
    }
    const innerContent = context.source.slice(0, closeTagIndex);
    const innerContentContext = createParserContext(innerContent);
    advanceBy(context, closeTagIndex + closeTag.length);
    return {
        type: 2 /* NodeTypes.ELEMENT */,
        tag: tagName,
        tagType: 0 /* ElementTypes.ELEMENT */,
        children: parseChildren(innerContentContext),
    };
}
function parseText(context) {
    let endIndex = context.source.length;
    const openInterpolationIndex = context.source.indexOf("{{");
    const closeInterpolationIndex = context.source.indexOf("}}");
    if (openInterpolationIndex !== -1 &&
        closeInterpolationIndex !== -1 &&
        openInterpolationIndex < closeInterpolationIndex) {
        endIndex = openInterpolationIndex;
    }
    const content = parseTextData(context, endIndex);
    return {
        type: 3 /* NodeTypes.TEXT */,
        content: content,
    };
}
function parseTextData(context, length) {
    const text = context.source.slice(0, length);
    advanceBy(context, length);
    return text;
}

function createVNodeCall(context, tag, props, children) {
    const { addHelper } = context;
    addHelper(CREATE_ELEMENT_VNODE);
    return {
        type: 2 /* NodeTypes.ELEMENT */,
        tag,
        props,
        children,
    };
}

function transformElement(node, context) {
    if (node.type === 2 /* NodeTypes.ELEMENT */) {
        return () => {
            const vnodeTag = `'${node.tag}'`;
            let vnodeProps;
            const children = node.children;
            let vnodeChildren = children[0];
            node.codegenNode = createVNodeCall(context, vnodeTag, vnodeProps, vnodeChildren);
        };
    }
}

function transformExpression(node) {
    if (node.type === 0 /* NodeTypes.INTERPOLATION */) {
        node.content.content = "_ctx." + node.content.content;
    }
}

const isText = (node) => {
    return node.type === 3 /* NodeTypes.TEXT */ || node.type === 0 /* NodeTypes.INTERPOLATION */;
};

function transformText(node) {
    if (node.type === 2 /* NodeTypes.ELEMENT */) {
        return () => {
            const { children } = node;
            let currentContainer;
            for (let i = 0; i < children.length; i++) {
                const child = children[i];
                if (isText(child)) {
                    for (let j = i + 1; j < children.length; j++) {
                        const next = children[j];
                        if (isText(next)) {
                            if (!currentContainer) {
                                currentContainer = children[i] = {
                                    type: 5 /* NodeTypes.COMPOUND_EXPRESSION */,
                                    children: [child],
                                };
                            }
                            currentContainer.children.push(" + ");
                            currentContainer.children.push(next);
                            children.splice(j, 1);
                            j--;
                        }
                        else {
                            currentContainer = undefined;
                            break;
                        }
                    }
                }
            }
        };
    }
}

function baseCompile(template) {
    const ast = baseParse(template);
    transform(ast, {
        nodeTransforms: [transformExpression, transformElement, transformText],
    });
    return generate(ast);
}

function compileToFunction(template) {
    const { code } = baseCompile(template);
    const render = new Function("Vue", code)(runtimeDom);
    return render;
}
registerRuntimeCompiler(compileToFunction);

export { createApp, createVNode as createElementVNode, createRenderer, createTextVNode, effect, getCurrentInstance, h, inject, nextTick, provide, proxyRefs, queueJobs, ref, registerRuntimeCompiler, renderSlot, toDisplayString };
