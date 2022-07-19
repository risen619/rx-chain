import { AsyncSubject, Observable, of } from "rxjs";
import { switchMap } from "rxjs/operators";

import { State } from "../state";
import { Task } from "../task";
import { Action, IExecutable, IState } from "../types";

export class ConditionalTask<Input = void, TR = void, ER = void>
    implements IExecutable<Input, TR | ER | null>, IState<TR | ER | null | undefined>
{
    private _state: State<TR | ER | null>;

    constructor(
        private _if: Action<Input, boolean>,
        private _then: Action<Input, TR>,
        private _else?: Action<Input, ER>
    ) { }

    getState() { return this._state.state; }

    execute(input: Input): Observable<TR | ER | null>
    {
        const subject = new AsyncSubject<TR | ER | null>();

        this._state = new State<TR | ER | null>();

        new Task(() => this._if(input))
            .execute()
            .pipe(
                switchMap(cond =>
                    cond ?
                        new Task(() => this._then(input)).execute() :
                        this._else != null ?
                            new Task(() => this._else!(input)).execute() :
                            of(null)
                )
            )
            .subscribe({
                next: v => (this._state.set(v), subject.next(v)),
                error: e => (this._state.reset(), subject.error(e)),
                complete: () => subject.complete()
            })

        return subject.asObservable();
    }
}