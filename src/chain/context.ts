import { asyncScheduler, Observable, Subject, of } from "rxjs";
import { catchError, subscribeOn, switchMap, tap } from "rxjs/operators";

import { State } from "../state";
import { Task } from "../task";
import { IExecutable, IState, Key, WithErr } from "../types";

import { Config } from "./config";

export interface Context<I = void, R = void> extends Config<I>
{
    key?: Key;
    task: IExecutable<I, R> & Partial<IState<R>>;
}

export class ExecutionContext
{
    constructor(private context: Context<any, any>, private state: State<any>)
    { }

    private executeTask(input: any)
    {
        return this.context.task.execute(input)
            .pipe(
                tap(v =>
                {
                    if (this.context.key)
                    {
                        this.state.set({
                            ...this.state.state,
                            [this.context.key]: (
                                this.context.abortOnFail ?
                                    v :
                                    { failed: false, value: v } as WithErr
                            )
                        });
                    }
                }),
                catchError(e =>
                {
                    if (this.context.abortOnFail)
                        throw e;

                    if (this.context.key)
                    {
                        this.state.set({
                            ...this.state.state,
                            [this.context.key]: { error: e, failed: true } as WithErr
                        });
                    }

                    return of(e);
                })
            );
    }

    execute(input: any)
    {
        const subject = new Subject();
        let obs: Observable<any>;

        if (!!this.context.condition)
        {
            obs = new Task(() => this.context.condition!({ _parent: input, ...this.state.state }))
                .execute()
                .pipe(
                    switchMap(condition => condition ? this.executeTask(input) : of(null))
                );
        }
        else
        {
            obs = this.executeTask(input);
        }

        obs
            .pipe(subscribeOn(asyncScheduler))
            .subscribe({
                next: (v) => subject.next(v),
                error: e => (subject.error(e), this.context.finally && this.context.finally(input)),
                complete: () => (subject.complete(), this.context.finally && this.context.finally(input))
            });

        return subject.asObservable();
    }
}