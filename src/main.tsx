import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { preloadRoute } from './routes/contentRoutes'

/**
 * Mount the app, but fetch the current route's content chunk first.
 *
 * `/services/*` and `/locations/*` are route-level chunks now. Every one of
 * those URLs is also served as a physical prerendered HTML file, so the
 * complete page is already on screen when this script runs. Rendering before
 * the chunk arrived would replace that page with the route fallback for as long
 * as the download took — a visible flash of a loading state over content the
 * visitor can already read.
 *
 * Awaiting the preload keeps the prerendered markup on screen until the real
 * page can replace it in one step. `preloadRoute` resolves immediately for
 * every other path, and never rejects: a chunk that fails to load surfaces at
 * render time instead, where the app can handle it.
 */
const mount = () => createRoot(document.getElementById("root")!).render(<App />);

preloadRoute(window.location.pathname).then(mount, mount);
