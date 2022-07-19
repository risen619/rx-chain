export interface ILoggable
{
    log: (...args: any[]) => any;
    warn: (...args: any[]) => any;
    error: (...args: any[]) => any;
}