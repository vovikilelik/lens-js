/*
 * Copyright (C) 2023 svinokot.
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2.1 of the License, or (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 */

import { Lens } from './lens.js';
import { createLens, transform, createCallback, Triggers } from './utils.js';

const _copyProperty = (original, source, key) => {
	const descriptor = Object.getOwnPropertyDescriptor(source, key);
	Object.defineProperty(original, key, descriptor);
};

export class Store extends Lens {

	get version() {
		return this._version || 0;
	}

	set(...args) {
		this._version ? this._version++ : (this._version = 1);
		super.set(...args);
	}

	go(key, instance = Store) {
		return super.go(key, instance);
	}

	list() {
		return Array.from(this);
	}

	transform(onGet, onSet, instance = Store) {
		return super.chain(transform(onGet, onSet, instance));
	}

	extends(prototype) {
		if (typeof prototype === 'function') {
			const currentProto = prototype(this);

			return Object.keys(currentProto).reduce((acc, key) => {
				if (typeof currentProto[key] === 'function') {
					acc[key] = currentProto[key];
				} else {
					_copyProperty(acc, currentProto, key);
				}

				return acc;
			}, this);
		} else {
			return Object.keys(prototype).reduce((acc, key) => {
				const field = prototype[key];

				if (field instanceof Lens) {
					Object.defineProperty(acc, key, { get: () => field });

					const fieldData = field.get();

					acc.define(key, field);
					acc[key].set(fieldData);
				} else {
					Object.defineProperty(acc, key, { get: () => acc.go(key) });
					acc[key].set(field);
				}

				return acc;
			}, this);
		}
	}

	view(prototype) {
		return Object.keys(prototype).reduce((acc, key) => {
			const field = prototype[key];

			Object.defineProperty(acc, key, { get: () => acc.go(key).get(), set: value => acc.go(key).set(value) });
			acc[key] = field;

			return acc;
		}, this);
	}

	on(trigger, ...callbacks) {
		if ((trigger || trigger === null) && callbacks.length) {
			this.subscribe(createCallback(trigger, ...callbacks));
		} else {
			this.subscribe(createCallback(Triggers.object, ...callbacks));
		}

		return this;
	}
}

export class ArrayStore extends Store {

	push(...value) {
		const data = this.get() || [];

		const length = data.push(...value);
		this.set(data);

		return length;
	}

	pop() {
		const data = this.get();
		
		if (!data) return undefined;
		
		const value = data.pop();
		this.set(data);

		return value;
	}
	
	delete(value) {
		const prev = this.get();
		
		if (!prev) return false;
		
		const data = typeof value === 'function'
			? prev.filter(value)
			: prev.filter(i => i !== value);
		
		const result = prev.length !== data.length;
		this.set(data);
		
		return result;
	}

	get length() {
		return this.get()?.length || 0;
	}
	
	isEmpty() {
		return this.length === 0;
	}
}

export const createStore = (dataOrRouter, instance = Store) => createLens(dataOrRouter, instance);
