# REVIEWERS, PLEASE NOTE

Due to the additional work required to anonymize this repository, the contents of this repository are *not* the final contents intended for review.
We will update the repository no later than March 31, 2024. This is within the time frame for updating paper submissions.
We apologize for the inconvenience.

# CCG VS Code Extension

*Please note that this is an anonymized version for reviewers.
The history of this project has been rewritten, and changes to the repository are only occasionally pushed.
The full repository will be opened after the review period.*

This is a VS Code Extension for __Code-centric Code Generation (CCG)__.

## Usage

Please make sure, you have the following installed:

- VS Code (tested with 1.87.2)
- Node.js (tested with 18.19.1)
- npm (10.2.4)

To use this extension locally, please follow these steps:

1. Clone this repository and the [`CCG-Core` repository](https://github.com/CCG-Paper/CCG-Core).
2. Follow the instructions in the `CCG-Core` repository and link it using `npm` as described in the project's README.
3. Install the dependencies of this repository by running `npm ci` to install the locked versions.
4. Do the same in the `reactflow-visualization` directory (again using `npm ci`).
5. Within `reactflow-visualization` run `npm run build` to build the sources needed for the tree view.
6. Go back up to the root of this project and build it using `npm run compile`.
7. Run the extension in a new extension host context by pressing F5. Alternatively, switch to the "Run and Debug" view and run the task `Run Extension`.
8. Feel free to copy the `examples` directory from this workspace into your newly opened extension workspace. \
__Please note:__ Copy it with the examples directory and not directly to preserve the paths to the respective prototype files.
