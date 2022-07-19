import { Observable } from "rxjs";

export interface IExecutable<Input = void, Result = void>
{
    execute(input: Input): Observable<Result>;
}