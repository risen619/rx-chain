import { throwError } from 'rxjs';
import { Chain } from '../src';

function main()
{
    new Chain({ logger: console })
        .task(() => throwError(null), 't')
        .execute()
        .subscribe({
            next: s => console.log(s.t),
            error: e => console.log(e)
        });
}

main();