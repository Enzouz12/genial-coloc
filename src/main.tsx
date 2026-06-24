import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "leaflet/dist/leaflet.css";
import "./index.css";
import App from "./App.tsx";
import { OfferDetailPage } from "./OfferDetailPage.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/offre/:id" element={<OfferDetailPage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
