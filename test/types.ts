import { Lens, Store, createLens, createStore, Differ, Triggers, Callbacks, transform } from '../src';

class MyLens<T> extends Lens<T> {

	constructor(a, b, c) {
		super(a, b, c);
	}

	public test() {}
}

export class XLens<T> extends Lens<T> {

	constructor(getter, setter, parent) {
		super(getter, setter, parent);
	}

	public go(key: keyof T) {
		return super.go(key, XLens<T[keyof T]>);
	}

	public testXLens() {}
}

function differ() {
	const store = createStore({ arr: [1, 2, 3], foo: 'foo' });

	store.go('foo').on(Differ.check('foo').is('foo'), () => {});
}

function test() {
	const store = createStore({ arr: [1, 2, 3] });

	const rr = store.transform(v => ({ foo: v.arr }), v => ({ arr: v.foo }), XLens);

	const trr = transform<{ arr: number[] }, { foo: number[] }>(v => ({ foo: v.arr }), v => ({ arr: v.foo }), MyLens);

	const rrchain = store.chain(trr);

	// rrchain.

//	rr.

	const rrxlens = store.go('arr', XLens);
//	rrxlens.

	const lens = createStore({ arr: [1, 2, 3] });

	const aa = lens.go('arr').list().map(l => {
		const v = l.get();
		return v;
	});

	const myLens = createStore({ arr: [1, 2, 3] }).go('arr', MyLens);

	const ab = myLens.chain(current => createStore(current.get())).list().map(l => {
		const v = l.get();
		return v;
	});

	for (const e of myLens.children()) {
		// e.value
	}

	const cLens = createLens('sdf', MyLens);

	for (const e of cLens.children()) {
		// e.value
	}

	// const f = (current) => {
	// 	return 1
	// }

	// const cLens = xLens.chain(f)

	const xLens = {} as XLens<{ x: 1 }>;
	const xo = xLens.go('x');
}

function test2() {
	const store = createStore({ arr: [1, 2, 3] });

	const ch = store.chain(current => createStore({ loo: 'loo' }));

	ch.go('loo');
}

function test3() {
	const store = createStore({ arr: [1, 2, 3] });

	const ch = store.extends({ moo: 'moo' });

	ch.go('moo', MyLens);
}

function test4() {
	const store = createStore({ arr: [1, 2, 3] });

	const pipe = Callbacks.pipe((e) => true, async () => await true, () => {});

	const ch = store.subscribe(pipe);

	store.go('arr').set([]);
	store.go('arr').set(p => p.concat([]));

	const sv = store.view({ count: 0 });
	sv.count++;

	store.set(prev => prev);
}