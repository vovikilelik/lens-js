import {Lens} from './lens-js.js';

/* 
 * Lens Utils
 * version 1.5.x
 * LGPLv3
 */

/**
 * Creating callback, which will be called only if current node would be changed
 * @param {Function} callback
 * @returns {Function}
 */
export const getStrictCallback = (callback) => (e) => {
	const { current } = e;
	current && callback(e);
};

/**
 * Creating callback, which will be called if current node and subtree would be changed or creating
 * @param {type} callback
 * @returns {Function}
 */
export const getTreeCallback = (callback) => (e) => {
	const { current, diffs } = e;
	(current || diffs.length === 0) && callback(e);
};

/**
 * Creating callback, which will be triggered on path from root to changed node
 * @param {type} callback
 * @returns {Function}
 */
export const getPathCallback = (callback) => (e) => {
	const { current, diffs } = e;
	(current || diffs.length > 0) && callback(e);
};

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
};

/**
 * Debounce function
 * @param {Number} defaultTimeout
 * @returns {Debounce}
 */
export function Debounce(defaultTimeout) {
    let sync = 0;
    this.run = (func, timeout = defaultTimeout) => {
        const stamp = ++sync;
        setTimeout(() => {
            (sync === stamp) && func();
        }, timeout);
    };
}

/**
 * Creating callback with throttling
 * @param {Function} callback
 * @param {Number} timeout
 * @returns {Function}
 */
export const getDebounceCallback = (callback, timeout = 0) => {
	const debounce = new Debounce(timeout);
	
	return (e) => {
		debounce.run(() => callback(e));
	};
};

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
};

/**
 * Create mappable fatory
 * @param {Function} getter
 * @param {Function} setter
 * @returns {Function}
 */
export const getMapper = (getter, setter) => (factory) => (key, parent) => {
	const lens = factory(key, parent);
	
	return new Lens(
		() => getter(lens.get()),
		(value, effect) => lens.set(setter(value, lens.get()), effect),
		lens
	);
};
