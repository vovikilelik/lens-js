/* 
 * Lens Utils
 * version 2.0.x
 * LGPLv3
 */

import { Lens } from './lens.js';
import { Debounce as Pool } from './lib/debounce.js';

export const Debounce = Pool;

const _isStrict = diffs => diffs.some(({ path }) => !path || !path.length);

/**
 * Creating callback, which will be called only if current node would be changed
 */
const object = ({ current, diffs }) => {
	const strictAndAssign = diffs.find(({ path }) => !path || path.length < 2);
	
	const change = (typeof current.value === 'object')
		? current.prev === undefined && current.value !== undefined
		: current.prev !== current.value;

	return strictAndAssign || change;
};

/**
 * Creating callback, which will be called only if current node would be replaced of new structure
 */
const strict = ({ diffs }) => _isStrict(diffs);

/**
 * Creating callback, which will be called if current node and subtree would be changed or creating
 */
const subtree = ({ diffs }) => _isStrict(diffs) || diffs.length === 0;

/**
 * Creating callback, which will be triggered on path from root to changed node
 */
const path = ({ diffs }) => _isStrict(diffs) || diffs.length > 0;

export const Triggers = { object, strict, subtree, path };

/**
 * Creating callback with throttling
 * @param {Function} callback
 * @param {Number} timeout
 * @returns {Function}
 */
const debounce = (callback, timeout) => {
	const pool = new Pool(timeout || 0);

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

export const createCallback = (trigger, ...callbacks) =>
	(...args) => (!trigger || trigger(...args)) && callbacks.forEach(c => c(...args));

/**
 * Namespace of callback factory
 * @type type
 */
export const Callbacks = {
	object: (...callbacks) => createCallback(Triggers.object, ...callbacks),
	strict: (...callbacks) => createCallback(Triggers.strict, ...callbacks),
	subtree: (...callbacks) => createCallback(Triggers.subtree, ...callbacks),
	path: (...callbacks) => createCallback(Triggers.path, ...callbacks),
	debounce,
	async
};

/**
 * Create mappable ChainFactory
 * @param {type} to getter
 * @param {type} from setter
 * @returns {ChainFactory} factory
 */
export const transform = (to, from, instance = Lens) => (current) => new instance(
	() => to(current.get()),
	(value, ...args) => current.set(from(value, current.get()), ...args),
	current
);

export const createLens = (data, instance = Lens, { onGet, onSet } = {}) => {
	const store = { data };
	
	if (onGet || onSet) {
		return new instance(
			() => onGet ? onGet(store.data) : store.data,
			(value) => onSet ? (store.data = onSet(value, store.data)) : (store.data = value)
		);
	} else {
		return new instance(
			() => store.data,
			(value) => store.data = value
		);
	}
};
