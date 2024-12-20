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

type NodeSetter<T> = (prev: T) => T;

export class Lens<T, P = unknown> {
	constructor(...args: ConstructorExt<T, P>);

	/* LensLike imlp */
	public get(): T;
	public set(value: T): void;
	public go<K extends keyof T>(key: K): Lens<T[K], P>;

	/* Overloads */
	public set(value: NodeSetter<T>): void;
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
	
	[Symbol.iterator]<L extends Lens<ArrayType<T>>>(): IterableIterator<L>;
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
	public go<K extends keyof T>(key: K): T[K] extends Array<any> ? ArrayStore<T[K], T> : Store<T[K], T>;
	public go<X extends Store<T[K]>, K extends keyof T, R = X>(key: K, instance: Instance<R, T[K]>): R;
	public go<X extends Store<T[K]>, K extends keyof T, R = X>(key: K, instance: Instance<R, T[K]>, ...args: unknown[]): R;
	public list<L extends Lens<ArrayType<T>> = Store<ArrayType<T>>>(): L[];

	public transform<B, X extends Lens<B>, R = X>(onGet: (value: T) => B, onSet: (value: B, prev: T) => T, instance?: Instance<R, B>): R;

	public extends<E extends object>(prototype: (lens: this) => E): this & E & StoreGoEntity<E>;
	public extends<E extends object, K extends keyof E>(prototype: E): this & { [X in K]: (E[X] extends Lens<any> ? E[X] : Lens<E[X]>) } & StoreGoEntity<E>;

	public view<E extends object, K extends keyof E>(prototype: E): this & { [X in K]: E[X] } & StoreGoEntity<E>;

	public on(callback: Callback<T> | Trigger<T>): this;
	public on(...triggerOrCallback: Array<Callback<T> | Trigger<T>>): this;

	public version: number;
}

export class ArrayStore<T, P = unknown, E = ArrayType<T>> extends Store<T, P> {
	public push(...value: E[]): number;
	public pop(): E | undefined;
	public delete(element: E | ((element: E, index: number, all: E[]) => boolean)): boolean;

	public length: number;
	
	public isEmpty(): boolean;
}

export function createStore<L extends Store<T>, T = unknown>(data: T, instance?: Instance<L, T>, options?: Adapter<T>): L;

export type CallbackWithSync<T> = (event: AttachEvent<T>, node: Lens<T>, sync: () => boolean, stamp: number) => void;

export type DebounceType = {
	run: (func: (sync: () => boolean, stamp: number) => void, timeout?: number) => void;
	cancel: () => void;
};

export interface DebounceConstructor {
	new(defaultTimeout?: number): DebounceType;
}

export const Debounce: DebounceConstructor;

export interface DifferMethods<T, V = T> {
	use(checker: (diff: NodeDiff<V>, node: Lens<V>) => boolean | undefined): Trigger<T>;
	is(...values: Array<V | ((value: V) => any)>): Trigger<T>;
	changed<T = any>(): Trigger<T>;
	defined<T = any>(defined?: boolean): Trigger<T>;
}

export namespace Differ {
	export function check<T = any, L extends Lens<T> = Lens<T>>(field: ((event: AttachEvent<T>, node: L) => NodeDiff<T>)): DifferMethods<T>;
	export function check<T = any, K extends keyof T = keyof T>(field: K): DifferMethods<T, T[K]>;
	export function check<T = any>(): DifferMethods<T>;
}

export namespace Triggers {
	export const deep: Trigger<any>;
	export const object: Trigger<any>;
	export const strict: Trigger<any>;
	export const subtree: Trigger<any>;
	export const path: Trigger<any>;
	export const combine: <T>(...triggers: Trigger<T>[]) => Trigger<T>;
	export const pass: <T>(trigger: Trigger<T>) => Trigger<T>;
	export const interrupt: <T>(trigger: Trigger<T>) => Trigger<T>;
}

export function createCallback<T>(trigger: Trigger<T>, ...callbacks: Array<Callback<T> | Trigger<T>>): Callback<T>;

export namespace Callbacks {

	export function async<R, T>(
		request: (event: AttachEvent<T>, node: Lens<T>) => Promise<R>,
		resolve: (result: R, event: AttachEvent<T>, node: Lens<T>, sync: () => boolean, stamp: number) => void,
		timeout?: number
	): Callback<T>;

	export function debounce<T>(callback: Callback<T> | CallbackWithSync<T>, timeout?: number): Callback<T>;

	export function object<T>(...callbacks: Callback<T>[]): Callback<T>;
	export function strict<T>(...callbacks: Callback<T>[]): Callback<T>;
	export function subtree<T>(...callbacks: Callback<T>[]): Callback<T>;
	export function path<T>(...callbacks: Callback<T>[]): Callback<T>;
	export function pipe<T>(...callbacks: Array<Trigger<T> | Promise<Trigger<T>>>): Trigger<T>;
}

export function transform<A, B = A, X extends Lens<B> = Lens<B>>(onGet: (value: A) => B, onSet: (value: B, prev: A) => A, instance?: Instance<X, B>): ChainFactory<Lens<A>, X>;

export interface Adapter<T> {
	onGet?: (value: T) => T;
	onSet?: (value: T, prev?: T) => T;
}

export function createLens<L extends Lens<T>, T = unknown>(data: T, instance?: Instance<L, T>, options?: Adapter<T>): L;

export function asArray<T = unknown, L = Lens<ArrayType<T>>>(lens: Lens<T>): L[];

export function createLocalStorageAdapter<T>(key: string): Adapter<T>;
