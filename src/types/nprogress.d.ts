declare module 'nprogress' {
    interface NProgressOptions {
        minimum?: number
        template?: string
        easing?: string
        speed?: number
        trickle?: boolean
        trickleSpeed?: number
        showSpinner?: boolean
        barSelector?: string
        spinnerSelector?: string
        parent?: string
    }

    interface NProgressStatic {
        configure(options: NProgressOptions): NProgressStatic
        set(number: number): NProgressStatic
        isStarted(): boolean
        start(): NProgressStatic
        done(force?: boolean): NProgressStatic
        inc(amount?: number): NProgressStatic
        trickle(): NProgressStatic
        render(fromStart?: boolean): HTMLDivElement
        remove(): void
        isRendered(): boolean
        getPositioningCSS(): string
    }

    const nprogress: NProgressStatic
    export = nprogress
}