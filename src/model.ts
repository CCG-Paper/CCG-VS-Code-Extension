export type CCGDocument = {
    baseCodePath: string,
    markedCCGNodes: any
};

export type CCGNode = {
    selection: SelectionState,
    id: string,
    bottomUpId: string
};

export enum SelectionState {
    condition = "condition",
    deletion = "deletion",
    repetition = "repetition",
    substitution = "substitution"
}