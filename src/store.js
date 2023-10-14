/* 
 LGPLv3
 */

import { Lens } from 'lens.js';
import { createLens } from 'utils.js';

const _copyProperty = (original, source, key) => {
	const descriptor = Object.getOwnPropertyDescriptor(source, key);
	Object.defineProperty(original, key, descriptor);
};

export class Store extends Lens {
	
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
				Object.defineProperty(acc, key, { get: () => acc.go(key) });
				acc[key].set(prototype[key]);
				
				return acc;
			}, this);
		}
	}
	
	on(typeOrTrigger, ...callbacks) {
		
		
		return this;
	}
}

export const createStore = (data, instance = Store, options = {}) => createLens(data, instance, options);