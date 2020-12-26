import {Lens} from './lens-js.js';

/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

/**
 * Read-write mapper
 * @param {Function} getter
 * @param {Function} setter
 * @returns {Mapper}
 */
export function Mapper(getter, setter) {
	this.getter = getter;
	this.setter = setter;
}

/**
 * Creating callback, which will be called only if current node would be changed
 * @param {Function} callback
 * @returns {Function}
 */
export const getStrictCallback = (callback) => (e) => {
	const { current } = e;
	current && callback(e);
}

/**
 * Getting array of Lens from any node
 * @param {Lens} lens
 * @returns {Array<Lens>}
 */
export const getArray = (lens) => {
	const raw = lens.get();
	return Object.keys(raw).map(k => lens.go(k));
}

/**
 * Create mappable fatory
 * @param {Mapper} mapper
 * @returns {Function}
 */
export const getFactory = ({ getter, setter }) => (factory) => (key, parent) => {
	const lens = factory(key, parent);
	
	return new Lens(
		() => getter(lens.get()),
		(value, effect) => {
                    lens.set(setter(value, lens.get()));
                    effect();
                },
		parent
	);
}
