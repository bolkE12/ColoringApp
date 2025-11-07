import AppNavigator from "./navigation/AppNavigator";
import { MusicProvider } from "./src/contexts/MusicContext";

export default function App() {
  return (
    <MusicProvider>
      <AppNavigator />
    </MusicProvider>
  );
}