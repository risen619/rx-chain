import { Observable } from "rxjs";

export type Key = number | string | symbol;
export function isKey(value: any): value is Key
{
    return ['number', 'string', 'symbol'].includes(typeof value);
}

export type ActionResult<T> = Observable<T> | Promise<T> | T;
export type Extract<T> = T extends Observable<infer R> ? R : T extends Promise<infer R> ? R : T;
export type WithErr<T = any, E = any> = { error?: E, value?: T, failed: boolean };

export type Action<I, R> = (arg: I) => ActionResult<R>;
export type ActionState<A extends Action<any, any>> = Extract<ReturnType<A>>;
export type ErrActionState<A extends Action<any, any>, E = any> = WithErr<ActionState<A>, E>;

export type ActionsRecord<Input, Keys extends string | number | symbol = string> = 
    Record<Keys, (args: Input) => ActionResult<any>>;
export type PureActionsRecordState<A extends ActionsRecord<any, any>> = { [K in keyof A]: ActionState<A[K]> };
export type ActionsRecordState<A extends ActionsRecord<any, any>> = { [K in keyof A]: ErrActionState<A[K]> };

export * from './iexecutable';
export * from './istate';