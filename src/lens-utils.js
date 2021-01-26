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
 * Creating callback, which will be called only if parent current node would be changed
 * @param {Function} callback
 * @param {number} a high node index
 * @param {number} b less node index
 * @returns {Function}
 */
export const getConsistsCallback = (callback, a = 1, b = a) => (e) => {
	const { diffs } = e;
	diffs.find(({ path }) => path && b <= path.length && path.length <= a) && callback(e);
}

const isNumber = (key) => !isNaN(key);
const getIndexOrName = (key) => isNumber(key) ? +key : key;

/**
 * Getting array of Lens from any node
 * @param {Lens} lens
 * @returns {Array<Lens>}
 */
export const getArray = (lens) => {
	const raw = lens.get();

	const isArray = !raw || Array.isArray(raw);
	return Object.keys(raw).map(k => {
		const key = isArray ? getIndexOrName(k) : k;
		return lens.go(key);
	});
}

/**
 * Create mappable fatory
 * @param {Mapper} mapper
 * @returns {Function}
 */
export const getMapper = ({ getter, setter }) => (factory) => (key, parent) => {
	const lens = factory(key, parent);
	
	return new Lens(
		() => getter(lens.get()),
		(value, effect) => lens.set(setter(value, lens.get()), effect),
		parent
	);
}
