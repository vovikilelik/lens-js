/* 
 * Lens Utils
 * version 2.0.x
 * LGPLv3
 */

import { Lens } from './lens-js.js';
import { Debounce as Pool } from './lib/debounce.js';

export const Debounce = Pool;

const _isStrict = diffs => diffs.some(({ path }) => !path || !path.length);

/**
 * Creating callback, which will be called only if current node would be changed
 * @param {Function} callback
 * @returns {Function}
 */
const change = (callback) => (...args) => {
	const [ { current, diffs } ] = args;

	const strictAndAssign = diffs.find(({ path }) => !path || path.length < 2);
	
	const change = (typeof current.value === 'object')
		? current.prev === undefined && current.value !== undefined
		: current.prev !== current.value;

	if (strictAndAssign || change) {
		return callback(...args);
	}
};

/**
 * Creating callback, which will be called only if current node would be replaced of new structure
 * @param {Function} callback
 * @returns {Function}
 */
const node = (callback) => (...args) => {
	const [ { diffs } ] = args;
	return _isStrict(diffs) && callback(...args);
};

/**
 * Creating callback, which will be called if current node and subtree would be changed or creating
 * @param {Function} callback
 * @returns {Function}
 */
const before = (callback) => (...args) => {
	const [ { diffs } ] = args;
	return (_isStrict(diffs) || diffs.length === 0) && callback(...args);
};

/**
 * Creating callback, which will be triggered on path from root to changed node
 * @param {Function} callback
 * @returns {Function}
 */
const after = (callback) => (...args) => {
	const [ { diffs } ] = args;
	return (_isStrict(diffs) || diffs.length > 0) && callback(...args);
};

/**
 * Creating callback with throttling
 * @param {Function} callback
 * @param {Number} timeout
 * @returns {Function}
 */
const debounce = (callback, timeout = 0) => {
	const pool = new Pool(timeout);

	return (...e) => {
		pool.run((...d) => callback(...e, ...d));
	};
};

/**
 * Creating callback whitch will call result if request finished last
 * @param {Function} Promise request
 * @param {Function} resolve callback for Promise.then()
 * @param {Number} timeout
 * @returns {Function}
 */
const async = (request, resolve, timeout = 0) => {
	return debounce(
		(event, lens, sync, ...args) => request(event, lens).then(r => sync() && resolve(r, event, lens, sync, ...args)),
		timeout
	);
};

/**
 * Namespace of callback factory
 * @type type
 */
export const Callback = { change, node, after, before, debounce, async };

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

export const createLens = (data, mapper) => {
	const store = { data };
	
	return mapper
		? new Lens(
			() => store.data,
			(value) => store.data = mapper(value, store.data)
		)
		: new Lens(
			() => store.data,
			(value) => store.data = value
		);
};