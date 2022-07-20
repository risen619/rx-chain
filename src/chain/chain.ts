import { AsyncSubject, concat, defer } from "rxjs";
import { ConditionalTask } from "../conditional";

import { Parallel } from "../parallel";
import { State } from "../state";
import { Task } from "../task";
import { ThrowableTask } from "../throwable";
import { Action, ActionsRecord, ActionsRecordState, ActionState, ErrActionState, IExecutable, isKey, IState, Key, WithErr } from "../types";
import { ILoggable } from "../types/iloggable";

import { ComplexConfig, Config, defaultConfig } from "./config";
import { ExecutionContext } from "./context";

type WithParentState<Parent, Own> = Own & { _parent: Parent };
type ChainConfig = {
    id?: string;
    logger?: ILoggable
};

export class Chain<Input = void, Result = {}>
    implements IExecutable<Input, Result>, IState<Result>
{
    private _state = new State<Result>();
    private _contexts: ExecutionContext[] = [];

    private _id?: string;
    private _logger?: ILoggable;

    constructor({ id, logger }: ChainConfig = {})
    {
        this._id = id || Math.random().toString(16).substring(2);
        this._logger = logger;
    }

    get id() { return this._id; }

    getState() { return this._state.state; }

    //#region Tasks

    private addUntrackedTask(action: Action<any, any>, config = defaultConfig())
    {
        const task = new Task(action);
        this._contexts.push(new ExecutionContext({ task, ...config, abortOnFail: true }, this._state));
        return this;
    }

    private addTask(action: Action<any, any>, id: Key, config = defaultConfig())
    {
        const task = new Task(action);
        this._contexts.push(new ExecutionContext({ key: id, task, ...config, abortOnFail: true }, this._state));
        return this;
    }

    // Untracked task
    task<A extends (arg: WithParentState<Input, Result>) => any>
        (action: A, config?: Omit<Config<WithParentState<Input, Result>>, 'abortOnFail'>): Chain<Input, Result>;

    // Tracked task
    task<
        A extends (arg: WithParentState<Input, Result>) => any,
        K extends Key,
        Cfg extends Omit<Config<WithParentState<Input, Result>>, 'abortOnFail'>
    >
        (action: A, id: K, config?: Cfg):
        Chain<
            Input,
            Result & ComplexConfig<Cfg, K, ActionState<A>, ActionState<A>>
        >;

    task(...args: any[])
    {
        if (!args || !args.length) return this;

        if (typeof args[0] === 'function')
        {
            if (isKey(args[1]))
                return this.addTask(args[0], args[1], args[2]);
            else
                return this.addUntrackedTask(args[0], args[1]);
        }

        return this;
    }
    //#endregion

    //#region Parallels

    private addUntrackedParallel(actions: Action<any, any>[], config = defaultConfig())
    {
        const task = new Parallel({}, actions);
        this._contexts.push(new ExecutionContext({ task, ...config, abortOnFail: true }, this._state));
        return this;
    }

    private addParallel(actions: any, id: any, config = defaultConfig())
    {
        const task = new Parallel(actions);
        this._contexts.push(new ExecutionContext({ task, key: id, ...config, abortOnFail: true }, this._state))
        return this;
    }

    private addCombinedParallel
        (actions: ActionsRecord<any, any>, untrackedActions: Action<any, any>[], id: Key, config = defaultConfig())
    {
        const task = new Parallel(actions, untrackedActions);
        this._contexts.push(new ExecutionContext({ task, key: id, ...config, abortOnFail: true }, this._state));
        return this as any;
    }

    // Untracked parallel
    parallel<
        A extends Array<(arg: WithParentState<Input, Result>) => any>,
        Cfg extends Omit<Config<WithParentState<Input, Result>>, 'abortOnFail'>
    >
        (actions: A, config?: Cfg): Chain<Input, Result>;

    // Tracked parallel
    parallel<
        A extends Record<AK, (arg: WithParentState<Input, Result>) => any>,
        AK extends Key,
        K extends Key,
        Cfg extends Omit<Config<WithParentState<Input, Result>>, 'abortOnFail'>
    >
        (actions: A, id: K, config?: Cfg):
        Chain<
            Input,
            Result & ComplexConfig<Cfg, K, ActionsRecordState<A>, ActionsRecordState<A>>
        >;

    // Combined parallel
    parallel<
        A extends Record<AK, Action<WithParentState<Input, Result>, any>>,
        B extends Array<Action<WithParentState<Input, Result>, any>>,
        AK extends Key,
        K extends Key,
        Cfg extends Omit<Config<WithParentState<Input, Result>>, 'abortOnFail'>
    >
        (actions: A, untrackedActions: B, id: K, config?: Cfg): 
        Chain<
            Input,
            Result & ComplexConfig<Cfg, K, ActionsRecordState<A>, ActionsRecordState<A>>
        >;

    parallel(...args: any[])
    {
        if (!args || !args.length) return this;

        if (typeof args[0] === 'object' && !Array.isArray(args[0]))
        {
            if (isKey(args[1]))
                return this.addParallel(args[0], args[1], args[2]);
            else if (Array.isArray(args[1]) && isKey(args[2]))
                return this.addCombinedParallel(args[0], args[1], args[2], args[3]);
        }
        else if (Array.isArray(args[0]))
        {
            return this.addUntrackedParallel(args[0], args[1]);
        }

        return this;
    }
    //#endregion

    //#region Chains

    private addUntrackedChain(factory: (chain: any) => any, config = defaultConfig())
    {
        const task = factory(new Chain<Result, void>());
        this._contexts.push(new ExecutionContext({ task, ...config }, this._state));
        return this;
    }

    private addChain(factory: (chain: any) => any, id: Key, config = defaultConfig())
    {
        const task = factory(new Chain<Result>());
        this._contexts.push(new ExecutionContext({ task, key: id, ...config }, this._state));
        return this;
    }

    // Untracked chain
    chain<
        C extends Chain<WithParentState<Input, Result>>
    >
    (factory: (chain: C) => C, config?: Config<WithParentState<Input, Result>>): Chain<Input, Result>;

    // Tracked chain
    chain<
        IC extends Chain<Result>,
        OC extends Chain<Result, R>,
        K extends Key,
        Cfg extends Config<WithParentState<Input, Result>>,
        R = OC extends Chain<Result, infer T> ? T : {}
    >
        (factory: (chain: IC) => OC, id: K, config?: Cfg):
        Chain<
            Input,
            Result & ComplexConfig<Cfg, K, R, WithErr<R>>
        >;

    chain(...args: any[])
    {
        if (args.length >= 2 && typeof args[0] === 'function' && isKey(args[1]))
            return this.addChain(args[0], args[1], args[2]);
        if (args.length >= 1 && typeof args[0] === 'function' && !isKey(args[1]))
            return this.addUntrackedChain(args[0], args[1]);

        return this;
    }

    //#endregion

    //#region Conditional

    private addUntrackedConditionalTask(
        cond: {
            if: Action<WithParentState<Input, Result>, boolean>,
            then: Action<WithParentState<Input, Result>, any>,
            else?: Action<WithParentState<Input, Result>, any>
        },
        config = defaultConfig()
    )
    {
        const task = new ConditionalTask(cond.if, cond.then, cond.else);
        this._contexts.push(new ExecutionContext({ task, ...config }, this._state));
        return this;
    }

    private addTrackedConditionalTask(
        cond: {
            if: Action<WithParentState<Input, Result>, boolean>,
            then: Action<WithParentState<Input, Result>, any>,
            else?: Action<WithParentState<Input, Result>, any>
        },
        id: Key,
        config = defaultConfig()
    )
    {
        const task = new ConditionalTask(cond.if, cond.then, cond.else);
        this._contexts.push(new ExecutionContext({ key: id, task, ...config }, this._state));
        return this;
    }

    conditional(
        cond: {
            if: Action<WithParentState<Input, Result>, boolean>,
            then: Action<WithParentState<Input, Result>, any>,
            else?: Action<WithParentState<Input, Result>, any>
        },
        config?: Config<WithParentState<Input, Result>>
    ): Chain<Input, Result>;

    conditional<
        T extends Action<WithParentState<Input, Result>, any>,
        E extends Action<WithParentState<Input, Result>, any>,
        K extends Key,
        Cfg extends Config<WithParentState<Input, Result>>
    >(
        cond: {
            if: Action<WithParentState<Input, Result>, boolean>,
            then: T,
            else?: E,
        },
        id: K,
        config?: Cfg
    ): Chain<
        Input,
        Result & ComplexConfig<Cfg, K, ActionState<T | E>, ErrActionState<T | E>>
    >;

    conditional(...args: any[])
    {
        if (!args || !args.length) return this;

        if (isKey(args[1]))
            return this.addTrackedConditionalTask(args[0], args[1], args[2]);
        else return this.addUntrackedConditionalTask(args[0], args[1]);
    }

    //#endregion

    //#region Throwable

    private addUntrackedThrowable(actions: { try: Action<any, any>, catch: Action<any, any> }, config = defaultConfig())
    {
        const task = new ThrowableTask(actions.try, actions.catch);
        this._contexts.push(new ExecutionContext({ task, ...config, abortOnFail: true }, this._state));
        return this;
    }

    private addTrackedThrowable(actions: { try: Action<any, any>, catch: Action<any, any> }, id: Key, config = defaultConfig())
    {
        const task = new ThrowableTask(actions.try, actions.catch);
        this._contexts.push(new ExecutionContext({ task, key: id, ...config, abortOnFail: true }, this._state));
        return this;
    }

    throwable(
        actions: {
            try: Action<WithParentState<Input, Result>, any>,
            catch: Action<{ input: WithParentState<Input, Result>, error: any }, any>
        },
        config?: Omit<Config<WithParentState<Input, Result>>, 'abortOnFail'>
    ): Chain<Input, Result>;

    throwable<
        T extends Action<WithParentState<Input, Result>, any>,
        C extends Action<{ input: WithParentState<Input, Result>, error: any }, any>,
        K extends Key,
        Cfg extends Omit<Config<WithParentState<Input, Result>>, 'abortOnFail'>
    >(
        actions: {
            try: T,
            catch: C
        },
        id: K,
        config?: Cfg
    ): Chain<
        Input,
        Result & ComplexConfig<Cfg, K, ErrActionState<T, ActionState<C>>, ErrActionState<T, ActionState<C>>>
    >;

    throwable(...args: any[])
    {
        if (!args || !args.length) return this;

        if (isKey(args[1]))
            return this.addTrackedThrowable(args[0], args[1], args[2]);
        else return this.addUntrackedThrowable(args[0], args[1]);
    }

    //#endregion

    execute(input: Input)
    {
        const subject = new AsyncSubject<Result>();

        this._logger?.log(`Executing chain ${this._id} with input: `, input);

        concat(
            ...this._contexts
                .map(ctx => defer(() => ctx.execute({ ...this.getState(), _parent: input })))
        )
            .subscribe({
                next: (v) => (
                    this._logger?.log(`Chain ${this._id} got value: `, v),
                    subject.next(this.getState())
                ),
                error: (e) => (
                    this._logger?.error(`Chain ${this._id} got error: `, e),
                    subject.error(e)
                ),
                complete: () => (
                    this._logger?.log(`Chain ${this._id} is complete`),
                    subject.complete()
                )
            })

        return subject.asObservable();
    }
}