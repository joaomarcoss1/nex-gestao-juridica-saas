import React from 'react';
import { renderToString } from 'react-dom/server';
(globalThis as any).React = React;
(globalThis as any).location = { pathname: '/dashboard' };
(globalThis as any).window = { location: (globalThis as any).location, addEventListener(){}, removeEventListener(){}, dispatchEvent(){} };
(globalThis as any).document = { querySelector(){ return null; }, addEventListener(){}, removeEventListener(){} };
import App from './client/src/App';
console.log(renderToString(<App/>));
