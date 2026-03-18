import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";

import { AppProviders } from "./providers/app-providers";
import { ErrorBoundary } from "./components/error-handling/ErrorBoundary";
import { router } from "./routes/router";
import "./styles.css";
import "driver.js/dist/driver.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>
    </ErrorBoundary>
  </React.StrictMode>
);
