import React from 'react';
import ReactDOM from 'react-dom';
import { injectGlobal } from 'styled-components';

import App from './App';

injectGlobal`
  *, *::before, *::after {
    box-sizing: border-box;
  }

  html {
    font: 10px/1.35 sans-serif;
  }

  html, body, #root {
    height: 100%;
    margin: 0;
  }
`;

ReactDOM.render(<App />, document.getElementById('root'));
