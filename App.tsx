import AppNavigator from "./navigation/AppNavigator";
import { MusicProvider } from "./src/contexts/MusicContext";
import { PurchaseProvider } from "./src/contexts/PurchaseContext";

export default function App() {
  return (
    <PurchaseProvider>
      <MusicProvider>
        <AppNavigator />
      </MusicProvider>
    </PurchaseProvider>
  );
}