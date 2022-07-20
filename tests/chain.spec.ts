import { of, Subject, throwError } from 'rxjs';
import { Chain } from '../src/chain';

describe('Chain', () =>
{
    it('should emit once providing state', done =>
    {
        let counter = 0;
        const chain = new Chain()
            .task(() => 1);
        chain.execute()
            .subscribe({
                next: s =>
                {
                    counter++;
                    expect(s).toBeUndefined();
                },
                complete: () =>
                {
                    expect(counter).toEqual(1);
                    done();
                }
            })
    });

    describe('Task', () =>
    {
        it('should add untracked task', done =>
        {
            let counter = 0;
            const chain = new Chain()
                .task(() => (counter++, 1));
    
            chain.execute()
                .subscribe({
                    complete: () =>
                    {
                        expect(counter).toEqual(1);
                        done();
                    }
                })
        });
    
        it('should add tracked task', done =>
        {
            const chain = new Chain()
                .task(() => 1, 'task');
            chain.execute()
                .subscribe({
                    next: s =>
                    {
                        expect(s).toEqual({ task: 1 });
                        done();
                    }
                });
        });

        it('should rethrow error from task', done =>
        {
            const chain = new Chain()
                .task(() => throwError('Error'));
            chain.execute()
                .subscribe({
                    error: e =>
                    {
                        expect(e).toEqual('Error');
                        done();
                    }
                })
        });

        it('should not go on if task fails', done =>
        {
            const chain = new Chain()
                .task(() => throwError('Error'))
                .task(() => done.fail('Second task should not execute'));

            chain.execute()
                .subscribe({
                    error: e =>
                    {
                        expect(e).toEqual('Error');
                        done();
                    }
                })
        });

        describe('Condition', () =>
        {
            it('should execute task if condition is true', done =>
            {
                const chain = new Chain()
                    .task(() => Promise.resolve(1), 'task', { condition: () => true });
    
                chain.execute()
                    .subscribe({
                        next: s =>
                        {
                            expect(s).toEqual({ task: 1 });
                            done();
                        }
                    })
            });
    
            it('should not execute task if condition is false', done =>
            {
                const chain = new Chain()
                    .task(() => Promise.resolve(1), 'task1', { condition: () => false })
                    .task(() => of(1), 'task2');
    
                chain.execute()
                    .subscribe({
                        next: s =>
                        {
                            expect(s.task1).toBeUndefined();
                            expect(s).toEqual({ task2: 1 });
                            done();
                        }
                    })
            });
        });

        describe('Finally', () =>
        {
            it('should execute finally if task is successful', done =>
            {
                const chain = new Chain()
                    .task(() => 1, { finally: () => done() });

                chain.execute();
            });

            it('should execute finally if task fails', done =>
            {
                const chain = new Chain()
                    .task(() => Promise.reject(1), { finally: () => done() });

                chain.execute();
            });
        });
    });

    describe('Parallel', () =>
    {
        it('should add untracked parallel', done =>
        {
            let counter = 0;
            const chain = new Chain()
                .parallel([
                    () => counter++,
                    () => ++counter,
                    () => counter += 1
                ]);

            chain.execute()
                .subscribe({
                    next: s =>
                    {
                        expect(s).toBeUndefined();
                        expect(counter).toEqual(3);
                        done();
                    }
                });
        });

        it('should add tracked parallel', done =>
        {
            const chain = new Chain()
                .parallel(
                    {
                        task1: () => 1,
                        task2: () => Promise.resolve(2),
                        task3: () => of(3),
                        task4: () => Promise.reject(4)
                    },
                    'parallel'
                );

            chain.execute()
                .subscribe({
                    next: s =>
                    {
                        expect(s).toEqual({
                            parallel: {
                                task1: { failed: false, value: 1 },
                                task2: { failed: false, value: 2 },
                                task3: { failed: false, value: 3 },
                                task4: { error: 4, failed: true }
                            }
                        });
                        done();
                    }
                });
        });

        it('should add combined parallel', done =>
        {
            let untrackedExecuted = false;
            const chain = new Chain()
                .parallel(
                    { task: () => 1 },
                    [() => untrackedExecuted = true],
                    'parallel'
                );

            chain.execute()
                .subscribe({
                    next: s =>
                    {
                        expect(untrackedExecuted).toBeTrue();
                        expect(s).toEqual({ parallel: { task: { failed: false, value: 1 } } });
                        done();
                    }
                })
        });

        it('should not fail if any of parallel tasks fail', done =>
        {
            const chain = new Chain()
                .parallel(
                    {
                        task1: () => { throw Error('Error') },
                        task2: () => Promise.reject('Error'),
                        task3: () => throwError('Error')
                    },
                    [
                        () => { throw Error('Error'); },
                        () => Promise.reject('Error'),
                        () => throwError('Error')
                    ],
                    'parallel'
                );

            chain.execute()
                .subscribe({
                    next: s =>
                    {
                        expect(s).toEqual({
                            parallel: {
                                task1: { error: Error('Error'), failed: true },
                                task2: { error: 'Error', failed: true },
                                task3: { error: 'Error', failed: true }
                            }
                        })
                    },
                    error: () => done.fail('Chain should not fail'),
                    complete: () =>
                    {
                        done();
                    }
                });
        });

        describe('Condition', () =>
        {
            it('should not execute parallel if condition is false', done =>
            {
                const chain = new Chain()
                    .parallel([() => done.fail('Should not execute it')], { condition: () => false });

                chain.execute()
                    .subscribe({
                        complete: () => done()
                    });
            });

            it('should execute parallel if condition is true', done =>
            {
                const chain = new Chain()
                    .parallel(
                        {
                            task: () => 1
                        },
                        'parallel',
                        { condition: () => true }
                    );

                chain.execute()
                    .subscribe({
                        complete: () =>
                        {
                            expect(chain.getState()).toEqual({ parallel: { task: { failed: false, value: 1 } } });
                            done();
                        }
                    });
            });
        });

        it('should execute finally', done =>
        {
            const chain = new Chain()
                .parallel([() => 1], { finally: () => done() });

            chain.execute();
        });
    });

    describe('Conditional', () =>
    {
        it('should add untracked conditional task', done =>
        {
            const chain = new Chain()
                .conditional({
                    if: () => true,
                    then: () => done(),
                    else: () => done.fail()
                });

            chain.execute()
                .subscribe({
                    next: s =>
                    {
                        expect(s).toBeUndefined();
                        done();
                    }
                })
        });

        it('should add tracked conditional task', done =>
        {
            const chain = new Chain()
                .conditional(
                    {
                        if: () => false,
                        then: () => 1,
                        else: () => 2
                    },
                    'cond'
                );

            chain.execute()
                .subscribe({
                    next: s =>
                    {
                        expect(s).toEqual({ cond: { failed: false, value: 2 } });
                        done();
                    }
                })
        });

        describe('Abort on Fail', () =>
        {
            it('should rethrow error from `if`', done =>
            {
                const chain = new Chain()
                    .conditional(
                        {
                            if: () => { throw Error('Error'); },
                            then: () => 1,
                            else: () => 2
                        },
                        'cond',
                        { abortOnFail: true }
                    );

                chain.execute()
                    .subscribe({
                        error: e =>
                        {
                            expect(e).toEqual(Error('Error'));
                            done();
                        }
                    });
            });

            it('should rethrow error from `then`', done =>
            {
                const chain = new Chain()
                    .conditional(
                        {
                            if: () => true,
                            then: () => Promise.reject('Error'),
                            else: () => 2
                        },
                        'cond',
                        { abortOnFail: true }
                    );

                chain.execute()
                    .subscribe({
                        error: e =>
                        {
                            expect(e).toEqual('Error');
                            done();
                        }
                    });
            });

            it('should rethrow error from `else`', done =>
            {
                const chain = new Chain()
                    .conditional(
                        {
                            if: () => false,
                            then: () => 1,
                            else: () => throwError('Error')
                        },
                        'cond',
                        { abortOnFail: true }
                    );

                chain.execute()
                    .subscribe({
                        error: e =>
                        {
                            expect(e).toEqual('Error');
                            done();
                        }
                    });
            });

            it('should not proceed in case of error', done =>
            {
                const chain = new Chain()
                    .conditional({ if: () => Promise.reject('Error'), then: () => 1 }, { abortOnFail: true })
                    .task(() => done.fail('should not proceed'));

                chain.execute()
                    .subscribe({
                        error: () => done()
                    });
            });

            it('should proceed in case of error', done =>
            {
                const chain = new Chain()
                    .conditional({ if: () => throwError('Error'), then: () => 1, else: () => 2 }, 'cond')
                    .task(() => 'task', 'task');

                chain.execute()
                    .subscribe({
                        next: s =>
                        {
                            expect(s).toEqual({
                                cond: { failed: true, error: 'Error' },
                                task: 'task'
                            });
                            done();
                        }
                    });
            });
        });

        describe('Condition', () =>
        {
            it('should execute task if condition is true', done =>
            {
                const chain = new Chain()
                    .conditional(
                        {
                            if: () => true,
                            then: () => 2
                        },
                        'cond',
                        { condition: () => true }
                    );

                chain.execute()
                    .subscribe({
                        next: s =>
                        {
                            expect(s).toEqual({ cond: { failed: false, value: 2 } })
                            done();
                        }
                    });
            });

            it('should not execute task if condition is false', done =>
            {
                const chain = new Chain()
                    .conditional(
                        {
                            if: () => true,
                            then: () => 2,
                            else: () => 3
                        },
                        'cond',
                        { condition: () => false }
                    );

                chain.execute()
                    .subscribe({
                        next: s =>
                        {
                            expect(s).toBeUndefined();
                            done();
                        }
                    });
            });
        });

        describe('Finally', () =>
        {
            it('should execute finally', done =>
            {
                const chain = new Chain()
                    .conditional(
                        { if: () => true, then: () => 1 },
                        { finally: () => done() }
                    );

                chain.execute();
            });
        });
    });

    describe('Throwable', () =>
    {
        it('should add untracked throwable task', done =>
        {
            const chain = new Chain()
                .throwable({ try: () => 1, catch: () => 2 });

            chain.execute()
                .subscribe({
                    next: s =>
                    {
                        expect(s).toBeUndefined();
                        done();
                    }
                });
        });

        it('should add tracked throwable task', done =>
        {
            const chain = new Chain()
                .throwable({ try: () => 1, catch: () => 2 }, 'task');

            chain.execute()
                .subscribe({
                    next: s =>
                    {
                        expect(s).toEqual({ task: { failed: false, value: 1 } });
                        done();
                    }
                });
        });

        it('should catch error from `try` and provide value from `catch` in error field', done =>
        {
            const chain = new Chain()
                .throwable({ try: () => Promise.reject('Error'), catch: () => 2 }, 'task');

            chain.execute()
                .subscribe({
                    next: s =>
                    {
                        expect(s).toEqual({
                            task: { failed: true, error: 2 }
                        });
                        done();
                    }
                });
        });

        it('should rethrow error from `catch`', done =>
        {
            const chain = new Chain()
                .throwable({ try: () => Promise.reject('Error'), catch: ({ error }) => throwError(error) });

            chain.execute()
                .subscribe({
                    error: e =>
                    {
                        expect(e).toEqual('Error');
                        done();
                    }
                });
        });

        describe('Condition', () =>
        {
            it('should execute task if condition is true', done =>
            {
                const chain = new Chain()
                    .throwable({ try: () => 1, catch: () => 2 }, 'task', { condition: () => true });

                chain.execute()
                    .subscribe({
                        next: s =>
                        {
                            expect(s).toEqual({ task: { failed: false, value: 1 } });
                            done();
                        }
                    });
            });

            it('should not execute task if condition is false', done =>
            {
                const chain = new Chain()
                    .throwable({ try: () => done.fail(), catch: () => done.fail() }, { condition: () => false });

                chain.execute()
                    .subscribe({
                        next: s =>
                        {
                            expect(s).toBeUndefined();
                            done();
                        }
                    });
            });
        });

        describe('Finally', () =>
        {
            it('should execute finally', done =>
            {
                const chain = new Chain()
                    .throwable({ try: () => 1, catch: () => 2 }, { finally: () => done() });

                chain.execute();
            });

            it('should execute finally if task fails', done =>
            {
                const chain = new Chain()
                    .throwable(
                         { try: () => { throw Error('Error'); }, catch: ({ error }) => Promise.reject(error) },
                         { finally: () => done() }
                    );

                chain.execute();
            });
        });
    });

    describe('Chain', () =>
    {
        it('should add untracked chain', done =>
        {
            const chain = new Chain()
                .chain(c => c.task(() => done()));

            chain.execute();
        });

        it('should add tracked chain', done =>
        {
            const chain = new Chain()
                .chain(
                    c => c.task(() => 1, 'inner_task'),
                    'chain'
                );

            chain.execute()
                .subscribe({
                    next: s =>
                    {
                        expect(s).toEqual({
                            chain: { failed: false, value: { inner_task: 1 } }
                        });
                        done();
                    }
                });
        });

        it('should provide parent state to inner chain', done =>
        {
            const chain = new Chain()
                .task(() => 1, 'task')
                .chain(
                    c => c.task(({ _parent }) => expect(_parent).toEqual({ task: 1, _parent: undefined })),
                )
                .task(() => done());

            chain.execute();
        });

        describe('Abort on Fail', () =>
        {
            it('should proceed on error', done =>
            {
                const chain = new Chain()
                    .chain(
                        c => c.task(() => { throw Error('Error'); }),
                        'chain'
                    )
                    .task(({ chain }) => expect(chain).toEqual({ failed: true, error: Error('Error') }))
                    .task(() => done());

                chain.execute();
            });

            it('should rethrow error', done =>
            {
                const chain = new Chain()
                    .chain(
                        c => c.task(() => Promise.reject('Error')),
                        { abortOnFail: true }
                    )
                    .task(() => done.fail('should not go on'));

                chain.execute()
                    .subscribe({
                        error: e =>
                        {
                            expect(e).toEqual('Error');
                            done();
                        }
                    });
            });
        });

        describe('Condition', () =>
        {
            it('should execute chain if condition is true', done =>
            {
                const chain = new Chain()
                    .chain(
                        c => c.task(() => done()),
                        { condition: () => true }
                    );

                chain.execute();
            });

            it('should not execute chain if condition is false', done =>
            {
                const chain = new Chain()
                    .chain(
                        c => c.task(() => done.fail('should not execute')),
                        { condition: () => false }
                    );

                chain.execute()
                    .subscribe({ complete: () => done() });
            });
        });

        describe('Finally', () =>
        {
            it('should execute finally', done =>
            {
                const chain = new Chain()
                    .chain(
                        c => c.task(() => 1),
                        { finally: () => done() }
                    );

                chain.execute();
            });

            it('should execute finally on error', done =>
            {
                const chain = new Chain()
                    .chain(
                        c => c.task(() => throwError(1)),
                        { abortOnFail: true, finally: () => done() }
                    );

                chain.execute();
            });
        });
    });
});