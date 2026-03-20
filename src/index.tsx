/* @refresh reload */
import { render } from 'solid-js/web';
import '@fontsource-variable/inter';
import './index.css';
import App from './App';

const root = document.getElementById('root');
if (root) {
  render(() => <App />, root);
}
