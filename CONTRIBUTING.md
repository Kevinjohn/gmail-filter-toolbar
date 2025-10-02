# Contributing to Gmail Calendar Options

We welcome contributions to this project! To ensure a smooth and collaborative process, please follow these guidelines.

## How to Contribute

1.  **Fork the Repository**: Start by forking the `chome-extension-gmail-calendar-options` repository to your GitHub account.
2.  **Clone Your Fork**: Clone your forked repository to your local machine:
    ```bash
    git clone https://github.com/YOUR_USERNAME/chome-extension-gmail-calendar-options.git
    cd chome-extension-gmail-calendar-options
    ```
3.  **Create a New Branch**: Create a new branch for your feature or bug fix. Use a descriptive name (e.g., `feature/add-new-filter` or `fix/toolbar-injection-bug`).
    ```bash
    git checkout -b your-branch-name
    ```
4.  **Make Your Changes**: Implement your changes, ensuring you adhere to the existing code style and conventions.
    *   **Code Style**: We use ESLint and Prettier. Please run `npm run lint` and `npm run format` before committing.
    *   **Testing**: Write unit tests for new features or bug fixes. Ensure all existing tests pass by running `npm test`.
5.  **Commit Your Changes**: Write clear and concise commit messages. Follow the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification if possible (e.g., `feat: add new filter option`, `fix: resolve toolbar injection issue`).
    ```bash
    git commit -m "feat: your concise commit message"
    ```
6.  **Push to Your Fork**: Push your changes to your forked repository.
    ```bash
    git push origin your-branch-name
    ```
7.  **Create a Pull Request**: Go to the original `chome-extension-gmail-calendar-options` repository on GitHub and create a new pull request from your branch. Provide a clear description of your changes and reference any related issues.

## Code Style and Quality

*   **ESLint**: We use ESLint for static code analysis. Please ensure your code passes linting checks.
*   **Prettier**: Code formatting is enforced with Prettier. Run `npm run format` to automatically format your code.
*   **Tests**: All new features and bug fixes should be accompanied by appropriate tests. Existing tests must pass.

## Reporting Bugs

If you find a bug, please open an issue using the "Bug Report" template. Provide as much detail as possible, including steps to reproduce, expected behavior, and actual behavior.

## Suggesting Enhancements

If you have an idea for a new feature or an improvement, please open an issue using the "Feature Request" template. Describe your idea clearly and explain why it would be beneficial.

## Localisation

If you would like to contribute translations, please use the "Localisation Request" issue template. You can either submit a pull request with the translated `messages.json` file or raise an issue with the translated text.

## Questions?

If you have any questions about contributing, feel free to open an issue or reach out to the maintainers.
