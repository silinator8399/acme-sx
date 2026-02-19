import EventEmitter from "events";


export type ACMEEventType = "error" | "log";

export type ACMEEvent<T extends ACMEEventType> = { type: T, message: string, timestamp: Date } & (ACMEErrorEvent | ACMElogEvent)
export type ACMEErrorEvent = {
    type: "error"
    stack: string
}
export type ACMElogEvent = {
    type: "log"
}



class ACMEEventManager extends EventEmitter{
    constructor() {
        super();
    }

    public emit<K extends ACMEEventType>(event: ACMEEventType, data: ACMEEvent<K>): boolean {
        if(this.listenerCount(event) === 0) return false
        return super.emit(event, data);
    }

    public on<K extends ACMEEventType>(event: K, listener: (data: ACMEEvent<K>) => void): this {
        return super.on(event, listener);
    }

    public log(message: string){
        this.emit("log", { type: "log", message, timestamp: new Date()});
    }

    public error(message: string, stack?: string){
        this.emit("error", { type: "error", message, stack: stack || "", timestamp: new Date()});
    }
}


export const ACMEEvents = new ACMEEventManager();
