export const blockRules : KeyArrayValue = {
    "js": [
        "statement"
    ],
    "html": [
        "htmlElement",
        "htmlContent"
    ]
};

export const ignoreRules : KeyArrayValue = {
    "html": [
        "SEA_WS"
    ]
};

type KeyArrayValue = {
    [key: string]: string[];
};