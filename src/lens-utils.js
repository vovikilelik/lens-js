/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

/* utils */

const getStrictCallback = (callback) => (e) => {
	const { current } = e;
	current && callback(e);
}

const getArray = (lens) => {
	const raw = lens.get();
	return Object.keys(raw).map(k => lens.go(k));
}

const getFactory = ({ getter, setter }) => (factory) => (key, parent) => {
	const lens = factory(key, parent);
	
	return new Lens(
		() => getter(lens.get()),
		(value) => lens.set(setter(value, lens.get())),
		parent
	);
}