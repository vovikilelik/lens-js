import { Lens, createLens } from '../src';

class MyLens<T> extends Lens<T> {

	constructor(a, b, c) {
		super(a, b, c);
	}
}

export class XLens<T> extends Lens<T> {

	constructor(getter, setter, parent) {
		super(getter, setter, parent);
	}

	public go(key: keyof T) {
		return super.go(key, XLens<T[keyof T]>);
	}
}

function test() {
	
	const lens = createLens({ arr: [1, 2, 3] });
	
	const aa = lens.go('arr').list().map(l => {
		const v = l.get();
		return v;
	});
	
	const myLens = createLens({ arr: [1, 2, 3] }).go('arr', MyLens);
	
	const ab = myLens.list().map(l => {
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