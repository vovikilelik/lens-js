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

export interface NodeDiff<T> {
	value: T;
	prev?: T;
	path?: string[];
}

export interface AttachEvent<T> {
	current?: NodeDiff<T>;
	diffs: NodeDiff<any>[];
}

export type Callback<T> = (event: AttachEvent<T>, node: Lens<T>) => void;

export type Getter<T> = () => T;
export type Setter<T> = (value: T) => void;

type Children<T, P, K extends keyof T> = Lens<T[K], P>;

export type ChainFactory<A extends Lens<any>, B extends Lens<any> = A> = (current: A) => B;

type Constructor<T, P = unknown> = [getter: Getter<T>, setter: Setter<T>, parent?: P];
type ConstructorExt<T, P = unknown> = [getter: Getter<T>, setter: Setter<T>, parent?: P, ...args: unknown[]];

type Instance<R, T> = new (...args: ConstructorExt<T>) => R;

export class Lens<T, P = unknown> {
	constructor(...args: ConstructorExt<T, P>);

	/* LensLike imlp */
	public get(): T;
	public set(value: T): void;
	public go<K extends keyof T>(key: K): Lens<T[K], P>;

	/* Overloads */
	public set(value: T): void;
	public go<X extends Lens<T[K]>, K extends keyof T, R = X>(key: K, instance: Instance<R, T[K]>): R;
	public go<X extends Lens<T[K]>, K extends keyof T, R = X>(key: K, instance: Instance<R, T[K]>, ...args: unknown[]): R;

	/* Own */
	public subscribe(callback: Callback<T>): () => void;
	public unsubscribe(callback: Callback<T>): boolean;
	public hasSubscribed(callback: Callback<T>): boolean;
	public subscribes(): Generator<Callback<T>>;
	
	public chain<B extends Lens<any>>(factory: ChainFactory<Lens<T, P>, B> | Instance<B, T>): B;
	public chain<B extends Lens<any>>(): B;

	public children<L extends Lens<ArrayType<T>>>(): Generator<{ key: string, value: L }>;
	
	public getter: Getter<T>;
	public setter: Setter<T>;
}

type ArrayType<T, R = unknown> = T extends (infer E)[] ? E : R;

export type Trigger<T, R = unknown> = (event: AttachEvent<T>, node: Lens<T>) => R | undefined;

type StoreGoEntity<T> = {
	go<K extends keyof T>(key: K): Store<T[K], T>;
	go<X extends Store<T[K]>, K extends keyof T, R = X>(key: K, instance: Instance<R, T[K]>): R;
	go<X extends Store<T[K]>, K extends keyof T, R = X>(key: K, instance: Instance<R, T[K]>, ...args: unknown[]): R;
}

export class Store<T, P = unknown> extends Lens<T, P> {

	/* Overloads */
	public go<K extends keyof T>(key: K): Store<T[K], T>;
	public go<X extends Store<T[K]>, K extends keyof T, R = X>(key: K, instance: Instance<R, T[K]>): R;
	public go<X extends Store<T[K]>, K extends keyof T, R = X>(key: K, instance: Instance<R, T[K]>, ...args: unknown[]): R;

	public list<L extends Lens<ArrayType<T>> = Store<ArrayType<T>>>(): L[];
	
	public transform<B, R extends Lens<B> = Lens<B>>(onGet: (value: T) => B, onSet: (value: B, prev: T) => T): R;

	public extends<E extends object>(prototype: (lens: this) => E): this & E & StoreGoEntity<E>;
	public extends<E extends object, K extends keyof E>(prototype: E): this & { [X in K]: (E[X] extends Lens<any> ? E[X] : Lens<E[X]>) } & StoreGoEntity<E>;
	
	public on(callback: Callback<T>): this;
	public on(trigger: Trigger<T>, callback: Callback<T>): this;
	
	public version: number;
}

export function createStore<L extends Store<T>, T = unknown>(key: T, instance?: Instance<L, T>, options?: CreateOptions<T>): L;

export type CallbackWithSync<T> = (event: AttachEvent<T>, node: Lens<T>, sync: () => boolean, stamp: number) => void;

export type DebounceType = {
	run: (func: (sync: () => boolean, stamp: number) => void, timeout?: number) => void;
	cancel: () => void;
};

export interface DebounceConstructor {
	new(defaultTimeout?: number): DebounceType;
}

export const Debounce: DebounceConstructor;

export interface DifferMethods {
	use<T>(): Trigger<T>;
	is<T>(...values: Array<T | ((value: T) => any)>): Trigger<T>;
	changed<T>(): Trigger<T>;
	defined<T>(defined?: boolean): Trigger<T>;
}

export namespace Differ {
	export function check<T, L extends Lens<T>>(field?: string | ((event: AttachEvent<T>, node: L) => NodeDiff<T>)): DifferMethods;
}

export namespace Triggers {
	export const object: Trigger<any>;
	export const strict: Trigger<any>;
	export const subtree: Trigger<any>;
	export const path: Trigger<any>;
	export const combine: <T>(...triggers: Trigger<T>[]) => Trigger<T>;
	export const pass: <T>(trigger: Trigger<T>) => Trigger<T>;
	export const interrupt: <T>(trigger: Trigger<T>) => Trigger<T>;
}

export function createCallback<T>(trigger: Trigger<T>, ...callbacks: Callback<T>[]): Callback<T>;

export namespace Callbacks {

	export function async<R, T>(
		request: (event: AttachEvent<T>, node: Lens<T>) => Promise<R>,
		resolve: (result: R, event: AttachEvent<T>, node: Lens<T>, sync: () => boolean, stamp: number) => void,
		timeout?: number
	): Callback<T>;

	export function debounce<T>(callback: Callback<T> | CallbackWithSync<T>, timeout?: number): Callback<T>;

	export function object<T>(callback: Callback<T>): Callback<T>;
	export function strict<T>(callback: Callback<T>): Callback<T>;
	export function subtree<T>(callback: Callback<T>): Callback<T>;
	export function path<T>(callback: Callback<T>): Callback<T>;
}

export function transform<A, B = A>(onGet: (value: A) => B, onSet: (value: B, prev: A) => A): ChainFactory<Lens<A>, Lens<B>>;

export interface Adapter<T> {
	onGet?: (value: T) => T;
	onSet?: (value: T, prev?: T) => T;
}

export function createLens<L extends Lens<T>, T = unknown>(key: T, instance?: Instance<L, T>, options?: Adapter<T>): L;

export function asArray<T = unknown, L = Lens<ArrayType<T>>>(lens: Lens<T>): L[];

export function createLocalStorageAdapter<T>(key: string): Adapter<T>;
