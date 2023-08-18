export class Range {

    static isRange(thing: any): thing is Range {
        if (thing instanceof Range) {
            return true;
        }
        if (!thing) {
            return false;
        }
        return Position.isPosition((<Range>thing).start)
            && Position.isPosition((<Range>thing.end));
    }

    static of(obj: Range | any): Range {
        if (obj instanceof Range) {
            return obj;
        }
        if (this.isRange(obj)) {
            return new Range(obj.start, obj.end);
        }
        throw new Error('Invalid argument, is NOT a range-like object');
    }

    protected _start: Position;
    protected _end: Position;

    get start(): Position {
        return this._start;
    }

    get end(): Position {
        return this._end;
    }

    constructor(start: Position, end: Position);
    constructor(start: Position, end: Position);
    constructor(startLine: number, startColumn: number, endLine: number, endColumn: number);
    constructor(startLineOrStart: number | Position | Position, startColumnOrEnd: number | Position | Position, endLine?: number, endColumn?: number) {
        let start: Position | undefined;
        let end: Position | undefined;

        if (typeof startLineOrStart === 'number' && typeof startColumnOrEnd === 'number' && typeof endLine === 'number' && typeof endColumn === 'number') {
            start = new Position(startLineOrStart, startColumnOrEnd);
            end = new Position(endLine, endColumn);
        } else if (Position.isPosition(startLineOrStart) && Position.isPosition(startColumnOrEnd)) {
            start = Position.of(startLineOrStart);
            end = Position.of(startColumnOrEnd);
        }

        if (!start || !end) {
            throw new Error('Invalid arguments');
        }

        if (start.isBefore(end)) {
            this._start = start;
            this._end = end;
        } else {
            this._start = end;
            this._end = start;
        }
    }

    contains(positionOrRange: Position | Range): boolean {
        if (Range.isRange(positionOrRange)) {
            return this.contains(positionOrRange.start)
                && this.contains(positionOrRange.end);

        } else if (Position.isPosition(positionOrRange)) {
            if (Position.of(positionOrRange).isBefore(this._start)) {
                return false;
            }
            if (this._end.isBefore(positionOrRange)) {
                return false;
            }
            return true;
        }
        return false;
    }

    isEqual(other: Range): boolean {
        return this._start.isEqual(other._start) && this._end.isEqual(other._end);
    }

    intersection(other: Range): Range | undefined {
        const start = Position.Max(other.start, this._start);
        const end = Position.Min(other.end, this._end);
        if (start.isAfter(end)) {
            // this happens when there is no overlap:
            // |-----|
            //          |----|
            return undefined;
        }
        return new Range(start, end);
    }

    union(other: Range): Range {
        if (this.contains(other)) {
            return this;
        } else if (other.contains(this)) {
            return other;
        }
        const start = Position.Min(other.start, this._start);
        const end = Position.Max(other.end, this.end);
        return new Range(start, end);
    }

    get isEmpty(): boolean {
        return this._start.isEqual(this._end);
    }

    get isSingleLine(): boolean {
        return this._start.line === this._end.line;
    }

    with(change: { start?: Position; end?: Position }): Range;
    with(start?: Position, end?: Position): Range;
    with(startOrChange: Position | undefined | { start?: Position; end?: Position }, end: Position = this.end): Range {

        if (startOrChange === null || end === null) {
            throw illegalArgument();
        }

        let start: Position;
        if (!startOrChange) {
            start = this.start;

        } else if (Position.isPosition(startOrChange)) {
            start = startOrChange;

        } else {
            start = startOrChange.start || this.start;
            end = startOrChange.end || this.end;
        }

        if (start.isEqual(this._start) && end.isEqual(this.end)) {
            return this;
        }
        return new Range(start, end);
    }

    toJSON(): any {
        return [this.start, this.end];
    }
}

export class Position {

    static Min(...positions: Position[]): Position {
        if (positions.length === 0) {
            throw new TypeError();
        }
        let result = positions[0];
        for (let i = 1; i < positions.length; i++) {
            const p = positions[i];
            if (p.isBefore(result!)) {
                result = p;
            }
        }
        return result;
    }

    static Max(...positions: Position[]): Position {
        if (positions.length === 0) {
            throw new TypeError();
        }
        let result = positions[0];
        for (let i = 1; i < positions.length; i++) {
            const p = positions[i];
            if (p.isAfter(result!)) {
                result = p;
            }
        }
        return result;
    }

    static isPosition(other: any): other is Position {
        if (!other) {
            return false;
        }
        if (other instanceof Position) {
            return true;
        }
        const { line, character } = <Position>other;
        if (typeof line === 'number' && typeof character === 'number') {
            return true;
        }
        return false;
    }

    static of(obj: Position | any): Position {
        if (obj instanceof Position) {
            return obj;
        } else if (this.isPosition(obj)) {
            return new Position(obj.line, obj.character);
        }
        throw new Error('Invalid argument, is NOT a position-like object');
    }

    private _line: number;
    private _character: number;

    get line(): number {
        return this._line;
    }

    get character(): number {
        return this._character;
    }

    constructor(line: number, character: number) {
        if (line < 0) {
            throw illegalArgument('line must be non-negative');
        }
        if (character < 0) {
            throw illegalArgument('character must be non-negative');
        }
        this._line = line;
        this._character = character;
    }

    isBefore(other: Position): boolean {
        if (this._line < other._line) {
            return true;
        }
        if (other._line < this._line) {
            return false;
        }
        return this._character < other._character;
    }

    isBeforeOrEqual(other: Position): boolean {
        if (this._line < other._line) {
            return true;
        }
        if (other._line < this._line) {
            return false;
        }
        return this._character <= other._character;
    }

    isAfter(other: Position): boolean {
        return !this.isBeforeOrEqual(other);
    }

    isAfterOrEqual(other: Position): boolean {
        return !this.isBefore(other);
    }

    isEqual(other: Position): boolean {
        return this._line === other._line && this._character === other._character;
    }

    compareTo(other: Position): number {
        if (this._line < other._line) {
            return -1;
        } else if (this._line > other.line) {
            return 1;
        } else {
            // equal line
            if (this._character < other._character) {
                return -1;
            } else if (this._character > other._character) {
                return 1;
            } else {
                // equal line and character
                return 0;
            }
        }
    }

    translate(change: { lineDelta?: number; characterDelta?: number }): Position;
    translate(lineDelta?: number, characterDelta?: number): Position;
    translate(lineDeltaOrChange: number | undefined | { lineDelta?: number; characterDelta?: number }, characterDelta: number = 0): Position {

        if (lineDeltaOrChange === null || characterDelta === null) {
            throw illegalArgument();
        }

        let lineDelta: number;
        if (typeof lineDeltaOrChange === 'undefined') {
            lineDelta = 0;
        } else if (typeof lineDeltaOrChange === 'number') {
            lineDelta = lineDeltaOrChange;
        } else {
            lineDelta = typeof lineDeltaOrChange.lineDelta === 'number' ? lineDeltaOrChange.lineDelta : 0;
            characterDelta = typeof lineDeltaOrChange.characterDelta === 'number' ? lineDeltaOrChange.characterDelta : 0;
        }

        if (lineDelta === 0 && characterDelta === 0) {
            return this;
        }
        return new Position(this.line + lineDelta, this.character + characterDelta);
    }

    with(change: { line?: number; character?: number }): Position;
    with(line?: number, character?: number): Position;
    with(lineOrChange: number | undefined | { line?: number; character?: number }, character: number = this.character): Position {

        if (lineOrChange === null || character === null) {
            throw illegalArgument();
        }

        let line: number;
        if (typeof lineOrChange === 'undefined') {
            line = this.line;

        } else if (typeof lineOrChange === 'number') {
            line = lineOrChange;

        } else {
            line = typeof lineOrChange.line === 'number' ? lineOrChange.line : this.line;
            character = typeof lineOrChange.character === 'number' ? lineOrChange.character : this.character;
        }

        if (line === this.line && character === this.character) {
            return this;
        }
        return new Position(line, character);
    }

    toJSON(): any {
        return { line: this.line, character: this.character };
    }
}

export function illegalArgument(name?: string): Error {
    if (name) {
        return new Error(`Illegal argument: ${name}`);
    } else {
        return new Error('Illegal argument');
    }
}

export class SemanticTokensLegend {
    public readonly tokenTypes: string[];
    public readonly tokenModifiers: string[];

    constructor(tokenTypes: string[], tokenModifiers: string[] = []) {
        this.tokenTypes = tokenTypes;
        this.tokenModifiers = tokenModifiers;
    }
}

export function isString(str: unknown): str is string {
    return (typeof str === 'string');
}

export function isStringArray(value: unknown): value is string[] {
    return Array.isArray(value) && (<unknown[]>value).every(elem => isString(elem));
}

function isStrArrayOrUndefined(arg: any): arg is string[] | undefined {
    return ((typeof arg === 'undefined') || isStringArray(arg));
}

export class SemanticTokensBuilder {

    private _prevLine: number;
    private _prevChar: number;
    private _dataIsSortedAndDeltaEncoded: boolean;
    private _data: number[];
    private _dataLen: number;
    private _tokenTypeStrToInt: Map<string, number>;
    private _tokenModifierStrToInt: Map<string, number>;
    private _hasLegend: boolean;

    constructor(legend?: SemanticTokensLegend) {
        this._prevLine = 0;
        this._prevChar = 0;
        this._dataIsSortedAndDeltaEncoded = true;
        this._data = [];
        this._dataLen = 0;
        this._tokenTypeStrToInt = new Map<string, number>();
        this._tokenModifierStrToInt = new Map<string, number>();
        this._hasLegend = false;
        if (legend) {
            this._hasLegend = true;
            for (let i = 0, len = legend.tokenTypes.length; i < len; i++) {
                this._tokenTypeStrToInt.set(legend.tokenTypes[i], i);
            }
            for (let i = 0, len = legend.tokenModifiers.length; i < len; i++) {
                this._tokenModifierStrToInt.set(legend.tokenModifiers[i], i);
            }
        }
    }

    public push(line: number, char: number, length: number, tokenType: number, tokenModifiers?: number): void;
    public push(range: Range, tokenType: string, tokenModifiers?: string[]): void;
    public push(arg0: any, arg1: any, arg2: any, arg3?: any, arg4?: any): void {
        if (typeof arg0 === 'number' && typeof arg1 === 'number' && typeof arg2 === 'number' && typeof arg3 === 'number' && (typeof arg4 === 'number' || typeof arg4 === 'undefined')) {
            if (typeof arg4 === 'undefined') {
                arg4 = 0;
            }
            // 1st overload
            return this._pushEncoded(arg0, arg1, arg2, arg3, arg4);
        }
        if (Range.isRange(arg0) && typeof arg1 === 'string' && isStrArrayOrUndefined(arg2)) {
            // 2nd overload
            return this._push(arg0, arg1, arg2);
        }
        throw illegalArgument();
    }

    private _push(range: Range, tokenType: string, tokenModifiers?: string[]): void {
        if (!this._hasLegend) {
            throw new Error('Legend must be provided in constructor');
        }
        if (range.start.line !== range.end.line) {
            throw new Error('`range` cannot span multiple lines');
        }
        if (!this._tokenTypeStrToInt.has(tokenType)) {
            throw new Error('`tokenType` is not in the provided legend');
        }
        const line = range.start.line;
        const char = range.start.character;
        const length = range.end.character - range.start.character;
        const nTokenType = this._tokenTypeStrToInt.get(tokenType)!;
        let nTokenModifiers = 0;
        if (tokenModifiers) {
            for (const tokenModifier of tokenModifiers) {
                if (!this._tokenModifierStrToInt.has(tokenModifier)) {
                    throw new Error('`tokenModifier` is not in the provided legend');
                }
                const nTokenModifier = this._tokenModifierStrToInt.get(tokenModifier)!;
                nTokenModifiers |= (1 << nTokenModifier) >>> 0;
            }
        }
        this._pushEncoded(line, char, length, nTokenType, nTokenModifiers);
    }

    private _pushEncoded(line: number, char: number, length: number, tokenType: number, tokenModifiers: number): void {
        if (this._dataIsSortedAndDeltaEncoded && (line < this._prevLine || (line === this._prevLine && char < this._prevChar))) {
            // push calls were ordered and are no longer ordered
            this._dataIsSortedAndDeltaEncoded = false;

            // Remove delta encoding from data
            const tokenCount = (this._data.length / 5) | 0;
            let prevLine = 0;
            let prevChar = 0;
            for (let i = 0; i < tokenCount; i++) {
                let line = this._data[5 * i];
                let char = this._data[5 * i + 1];

                if (line === 0) {
                    // on the same line as previous token
                    line = prevLine;
                    char += prevChar;
                } else {
                    // on a different line than previous token
                    line += prevLine;
                }

                this._data[5 * i] = line;
                this._data[5 * i + 1] = char;

                prevLine = line;
                prevChar = char;
            }
        }

        let pushLine = line;
        let pushChar = char;
        if (this._dataIsSortedAndDeltaEncoded && this._dataLen > 0) {
            pushLine -= this._prevLine;
            if (pushLine === 0) {
                pushChar -= this._prevChar;
            }
        }

        this._data[this._dataLen++] = pushLine;
        this._data[this._dataLen++] = pushChar;
        this._data[this._dataLen++] = length;
        this._data[this._dataLen++] = tokenType;
        this._data[this._dataLen++] = tokenModifiers;

        this._prevLine = line;
        this._prevChar = char;
    }

    private static _sortAndDeltaEncode(data: number[]): Uint32Array {
        const pos: number[] = [];
        const tokenCount = (data.length / 5) | 0;
        for (let i = 0; i < tokenCount; i++) {
            pos[i] = i;
        }
        pos.sort((a, b) => {
            const aLine = data[5 * a];
            const bLine = data[5 * b];
            if (aLine === bLine) {
                const aChar = data[5 * a + 1];
                const bChar = data[5 * b + 1];
                return aChar - bChar;
            }
            return aLine - bLine;
        });
        const result = new Uint32Array(data.length);
        let prevLine = 0;
        let prevChar = 0;
        for (let i = 0; i < tokenCount; i++) {
            const srcOffset = 5 * pos[i];
            const line = data[srcOffset + 0];
            const char = data[srcOffset + 1];
            const length = data[srcOffset + 2];
            const tokenType = data[srcOffset + 3];
            const tokenModifiers = data[srcOffset + 4];

            const pushLine = line - prevLine;
            const pushChar = (pushLine === 0 ? char - prevChar : char);

            const dstOffset = 5 * i;
            result[dstOffset + 0] = pushLine;
            result[dstOffset + 1] = pushChar;
            result[dstOffset + 2] = length;
            result[dstOffset + 3] = tokenType;
            result[dstOffset + 4] = tokenModifiers;

            prevLine = line;
            prevChar = char;
        }

        return result;
    }

    public build(resultId?: string): SemanticTokens {
        if (!this._dataIsSortedAndDeltaEncoded) {
            return new SemanticTokens(SemanticTokensBuilder._sortAndDeltaEncode(this._data), resultId);
        }
        return new SemanticTokens(new Uint32Array(this._data), resultId);
    }
}

export class SemanticTokens {
    readonly resultId: string | undefined;
    readonly data: Uint32Array;

    constructor(data: Uint32Array, resultId?: string) {
        this.resultId = resultId;
        this.data = data;
    }
}

export class SemanticTokensEdit {
    readonly start: number;
    readonly deleteCount: number;
    readonly data: Uint32Array | undefined;

    constructor(start: number, deleteCount: number, data?: Uint32Array) {
        this.start = start;
        this.deleteCount = deleteCount;
        this.data = data;
    }
}

export class SemanticTokensEdits {
    readonly resultId: string | undefined;
    readonly edits: SemanticTokensEdit[];

    constructor(edits: SemanticTokensEdit[], resultId?: string) {
        this.resultId = resultId;
        this.edits = edits;
    }
}