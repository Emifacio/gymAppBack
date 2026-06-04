# Contributing to Gym Platform

Thank you for your interest in contributing to Gym Platform! We welcome contributions from everyone.

This document outlines the guidelines and best practices for contributing to this project.

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please report any unacceptable behavior according to the instructions in that document.

## How to Contribute

### Reporting Bugs

If you find a bug, please check the existing issues to see if it has already been reported. If not, open a new issue using our **Bug Report** template and include:

- A clear description of the issue.
- Steps to reproduce the bug.
- Expected vs. actual behavior.
- Environment details (OS, Python version, Node version, etc.).

### Suggesting Enhancements

If you have an idea for a feature or improvement, check the existing issues and then open a new issue using our **Feature Request** template. Describe the feature, why it would be useful, and any design/implementation ideas you have.

### Submitting Pull Requests

1. **Fork the Repository**: Create a fork of this repository on GitHub.
2. **Clone the Fork**: Clone your fork to your local machine.
3. **Create a Branch**: Create a new branch for your work:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b bugfix/your-bug-name
   ```
4. **Make Your Changes**: Write clean, commented, and well-tested code.
5. **Verify Your Changes**: Follow the instructions below to run linting, formatting, and tests.
6. **Commit Your Changes**: Follow standard commit message guidelines (e.g., [Conventional Commits](https://www.conventionalcommits.org/)):
   ```bash
   git commit -m "feat: add user profile picture upload"
   git commit -m "fix: resolve concurrency issue on booking"
   ```
7. **Push and Open a PR**: Push your branch to your fork and open a Pull Request (PR) against our `main` branch.

---

## Local Development Setup

### Backend Setup

1. **Requirements**: Python 3.11+ and PostgreSQL.
2. **Create a Virtual Environment**:
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```
3. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```
4. **Configure Environment**: Copy `.env.example` to `.env` and fill in local database/caching details.
5. **Run Database Migrations**:
   ```bash
   alembic upgrade head
   ```
6. **Run Backend Tests**:
   ```bash
   python -m unittest discover tests
   ```
7. **Run the API**:
   ```bash
   uvicorn app.main:app --reload
   ```

### Frontend Setup

1. **Requirements**: Node.js 22+, pnpm 10+.
2. **Install Workspace Dependencies**:
   ```bash
   pnpm install
   ```
3. **Generate API Client types**: Make sure the backend is running or OpenAPI schema is available, then generate types:
   ```bash
   pnpm generate:api
   ```
4. **Run Dev Servers**:
   - For the Web dashboard: `pnpm dev:web`
   - For the Mobile Expo app: `pnpm dev:mobile`
5. **Run Verification checks**:
   - Linting: `pnpm lint`
   - Typechecking: `pnpm typecheck`
   - Builds: `pnpm build:web` and `pnpm build:mobile`

---

## Style Guidelines

- **Python**: Follow PEP 8 guidelines. We recommend formatting your code with Black or Ruff.
- **TypeScript/React**: Follow ESLint and Prettier rules defined in the workspace packages. Run `pnpm lint` to find issues and `pnpm lint --fix` to auto-resolve styling issues.
- **Documentation**: If you change APIs or add features, update the `README.md` and inline documentation (docstrings / comments) accordingly.
