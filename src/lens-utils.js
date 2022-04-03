import { Lens } from './lens-js.js';

/* 
 * Lens Utils
 * version 1.6.x
 * LGPLv3
 */

/**
 * Creating callback, which will be called only if current node would be changed
 * @param {Function} callback
 * @returns {Function}
 */
export const getStrictCallback = (callback) => (e) => {
	const {current} = e;
	current && callback(e);
};

/**
 * Creating callback, which will be called if current node and subtree would be changed or creating
 * @param {type} callback
 * @returns {Function}
 */
export const getTreeCallback = (callback) => (e) => {
	const {current, diffs} = e;
	(current || diffs.length === 0) && callback(e);
};

/**
 * Creating callback, which will be triggered on path from root to changed node
 * @param {type} callback
 * @returns {Function}
 */
export const getPathCallback = (callback) => (e) => {
	const {current, diffs} = e;
	(current || diffs.length > 0) && callback(e);
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
			(sync === stamp) && func(() => stamp === sync, stamp);
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
		debounce.run((...args) => callback(e, ...args));
	};
};

/**
 * Creating callback whitch will call result if request finished last
 * @param {Promise} Promise request
 * @param {Function} resolve callback for Promise.then()
 * @param {Number} timeout
 * @returns {Function}
 */
export const getAsyncCallback = (request, resolve, timeout = 0) => {
	return getDebounceCallback(
		(e, sync, ...args) => request(e).then(r => sync() && resolve(r, e, sync, ...args)),
		timeout
	);
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
 * Create mappable ChainFactory
 * @param {type} to getter
 * @param {type} from setter
 * @returns {ChainFactory} factory
 */
export const transform = (to, from) => (current) => new Lens(
	() => to(current.get()),
	(value, ...args) => current.set(from(value), ...args),
	current
);

export const createLens = (initData, mapper) => {
	const store = {lens: { ...initData }};
	
	return mapper
		? new Lens(
			() => store.lens,
			(value) => store.lens = mapper(value, store.lens)
		)
		: new Lens(
			() => store.lens,
			(value) => store.lens = value
		);
};