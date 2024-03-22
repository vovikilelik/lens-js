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

	set(value, ...args) {
		this._version ? this._version++ : (this._version = 1);
		super.set(typeof value === 'function' ? value(this.get()) : value, ...args);
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

	push(value) {
		this.set(this.get().push(value));
	}

	pop() {
		const data = this.get();
		const value = data[data.length - 1];

		this.set(data.slice(0, -1));

		return value;
	}

	find() {

	}

	delete(value) {
		const data = typeof value === 'function'
			? this.get().filter(value)
			: this.get().filter(i => i !== value);

		this.set(data);
	}
}

export const createStore = (dataOrRouter, instance = Store) => createLens(dataOrRouter, instance);
