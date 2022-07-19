import { Observable, from, of, AsyncSubject } from "rxjs";

import { State } from "../state";
import { ActionResult, IExecutable, IState } from "../types";

export class Task<Input = void, Result = void> implements IExecutable<Input, Result>, IState<Result>
{
    private _state: State<Result>;

    constructor(private action: (args: Input) => ActionResult<Result>)
    {
        this._state = new State<Result>();
    }

    getState() { return this._state.state; }

    execute(input: Input): Observable<Result>
    {
        const subject = new AsyncSubject<Result>();

        let result: any;
        try
        {
            result = this.action(input as any);
        }
        catch (e)
        {
            subject.error(e);
            return subject.asObservable();
        }
        
        let obs: Observable<Result>;

        if (result instanceof Observable) obs = result;
        else if (result instanceof Promise) obs = from(result);
        else obs = of(result);

        obs.subscribe({
            next: v => (this._state.set(v), subject.next(v)),
            error: e => subject.error(e),
            complete: () => subject.complete()
        });

        return subject.asObservable();
    }
}
