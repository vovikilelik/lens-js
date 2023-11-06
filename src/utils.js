/* 
 * Lens Utils
 * version 2.0.x
 * LGPLv3
 */

import { Lens } from './lens.js';
import { Debounce as Pool } from './lib/debounce.js';

export const Debounce = Pool;

const _passIfFalse = value => value ? value : undefined;
const _interruptIfFalse = value => value ? value : false;

const _isStrict = diffs => diffs.some(({ path }) => !path || !path.length);

/**
 * Creating callback, which will be called only if current node would be changed
 */
const object = ({ current, diffs }) => {
	const strictAndAssign = diffs.find(({ path }) => !path || path.length < 2);
	
	const change = (typeof current.value === 'object')
		? current.prev === undefined && current.value !== undefined
		: current.prev !== current.value;

	return _passIfFalse(strictAndAssign || change);
};

/**
 * Creating callback, which will be called only if current node would be replaced of new structure
 */
const strict = ({ diffs }) => _passIfFalse(_isStrict(diffs));

/**
 * Creating callback, which will be called if current node and subtree would be changed or creating
 */
const subtree = ({ diffs }) => _passIfFalse(_isStrict(diffs) || diffs.length === 0);

/**
 * Creating callback, which will be triggered on path from root to changed node
 */
const path = ({ diffs }) => _passIfFalse(_isStrict(diffs) || diffs.length > 0);

const _combineTriggers = (...triggers) => (...args) => {
	for (const trigger of triggers) {
		const result = trigger(...args);
		
		if (result !== undefined)
			return result;
	}
};

const _passTrigger = trigger => (...args) => _passIfFalse(trigger(...args));
const _interruptTrigger = trigger => (...args) => _interruptIfFalse(trigger(...args));

export const Triggers = { object, strict, subtree, path, combine: _combineTriggers, pass: _passTrigger, interrupt: _interruptTrigger };

const _getField = (source, path) => {
	if (path.length === 1)
		return source[path[0]];
	
	let name = path[0];
	let value = source;
	
	for (i = 0; i < path.length && value; i++)
		value = value[name];
	
	return value;
};

const createDefaultDiffGetter = (field) => {
	const fieldPath = field && field.split('.');
	
	return ({ current }) => {
		if (!fieldPath)
			return current;
		
		const value = current.value && _getField(current.value, fieldPath);
		const prev = current.prev && _getField(current.prev, fieldPath);
		
		return { value, prev, path: current.path };
	};
};

const check = (field) => {
	const diffGetter = typeof field === 'string' || !field
		? createDefaultDiffGetter(field)
		: field;

	const checker = (method) => (event, ...args) => {
		const diff = diffGetter(event);
		return diff && method(diff, ...args);
	};
	
	return {
		use: checker,
		is: (...values) => checker(({ value }) => values.some(v => (typeof v === 'function') ? v(value) : v === value)),
		changed: () => checker(({ value, prev }) => value !== prev),
		defined: (defined = true) => checker(({ value, prev }) => ((prev === undefined || prev === null) === defined) && ((value !== undefined && value !== null) === defined))
	};
};

export const Differ = { check };

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

export const asArray = lens => Array.from(lens);

const _createLensFromMapper = (router, instance = Lens) => new instance(
	() => router.get(),
	(value, ...args) => router.set(value, ...args)
);

export const createLens = (dataOrRouter, instance = Lens) => {
	if (dataOrRouter instanceof Router) {
		return _createLensFromMapper(dataOrRouter, instance);
	} else {
		const store = { data };
		
		return new instance(
			() => store.data,
			(value) => store.data = value
		);
	}
};

