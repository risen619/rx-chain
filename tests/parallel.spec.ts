import { of, throwError } from 'rxjs';
import { Parallel } from '../src/parallel';

describe('Parallel', () =>
{
    it('should emit state on next once', done =>
    {
        const parallel = new Parallel({
            task1: () => 1,
            task2: () => Promise.resolve(2),
            task3: () => of(3, 4),
            task4: () => { throw Error('Error'); }
        });

        const expectedState = {
            task1: { failed: false, value: 1 },
            task2: { failed: false, value: 2 },
            task3: { failed: false, value: 4 },
            task4: { error: Error('Error'), failed: true }
        };

        let nextCounter = 0;

        parallel.execute()
            .subscribe({
                next: s =>
                {
                    nextCounter++;
                    expect(s).toEqual(expectedState);
                },
                complete: () =>
                {
                    expect(parallel.getState()).toEqual(expectedState);
                    expect(nextCounter).toEqual(1);
                    done();
                }
            })
    });

    it('should never throw error', done =>
    {
        const parallel = new Parallel(
            {
                task1: () => { throw new Error('Error'); },
                task2: () => Promise.reject('Error'),
                task3: () => throwError('Error')
            },
            [() => throwError('Error')]
        );
        parallel.execute()
            .subscribe({
                error: () => done.fail('Parallel should not throw any errors'),
                complete: () => done()
            })
    });

    it('should not contain anything in state', done =>
    {
        const parallel = new Parallel({}, [() => 1, () => 2]);

        parallel.execute()
            .subscribe({
                complete: () =>
                {
                    expect(parallel.getState()).toEqual({});
                    done();
                }
            });
    });

    it('should execute tracked / untracked actions', done =>
    {
        let counter = 0;

        const parallel = new Parallel(
            {
                task1: () => 1,
                task2: () => Promise.resolve(2)
            },
            [
                () => counter++,
                () => ++counter,
                () => counter += 1
            ]
        );

        parallel.execute()
            .subscribe({
                complete: () =>
                {
                    expect(parallel.getState()).toEqual({
                        task1: { failed: false, value: 1 },
                        task2: { failed: false, value: 2 },
                    });
                    expect(counter).toEqual(3);
                    done();
                }
            });
    });
});