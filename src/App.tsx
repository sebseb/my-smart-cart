import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { GroceryProvider } from "@/context/GroceryContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { SharedListPage } from "./pages/SharedListPage";
import { SharedRecipePage } from "./pages/SharedRecipePage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <GroceryProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/shared/list/:token" element={<SharedListPage />} />
            <Route path="/shared/recipe/:token" element={<SharedRecipePage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </GroceryProvider>
  </QueryClientProvider>
);

export default App;
