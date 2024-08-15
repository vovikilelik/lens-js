import { Lens, Store, ArrayStore, createLens, createStore, Differ, Triggers, Callbacks, transform } from '../src';

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

	// const t1 = Differ.check<{ arr: number[], foo: string }>('foo').is('foo');

	store.go('foo').on(Differ.check<string>().is('1'), () => {});
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

	const t1 = Differ.check().changed();
	const t2 = Differ.check<{ arwr: number[] }>('arwr').changed();
	const t3 = Differ.check<{ arr: number[] }>('arr').is([]);

	const t4 = Differ.check<{ arr: number[] }>('arr');

	store.on(t1, t2, t3, t4.is([]) ,console.log);
}

function test4() {
	const store = createStore({ arr: [1, 2, 3] });

	const pipe = Callbacks.pipe<{ arr: number[] }>((e) => true, async () => await true, () => {});

	const ch = store.subscribe(pipe);

	store.go('arr').set([]);
	store.go('arr').set(p => p.concat([]));

	const sv = store.view({ count: 0 });
	sv.count++;

	store.set(prev => prev);
}

interface Arr {
	arr: number[];
	noarr: string;
	uarr?: number[];
}

function test5() {
	const store = createStore({ arr: [1, 2, 3], noarr: '' } as Arr);

	const arr1 = store.go('noarr');
	const arr2 = store.go('uarr');
	
	const v = arr2.get();
	
	arr2.push(3);
	arr2.delete(2);
	arr2.delete((v) => v === 1);
	const z = arr2.pop();
	arr2.length;
}

function test6() {

}